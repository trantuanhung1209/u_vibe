# Redis trong Uside Vibe

Tài liệu này mô tả chi tiết cách Redis được áp dụng trong dự án: lý do chọn, các use case cụ thể, cấu trúc key, và hướng dẫn setup.

---

## Tại sao cần Redis?

Trước khi có Redis, dự án có 3 vấn đề:

| Vấn đề | Nguyên nhân | Tác động |
|--------|-------------|----------|
| Rate limiter chậm | `RateLimiterPrisma` ghi vào PostgreSQL mỗi request | Mỗi lần tạo project/message tốn thêm 1 DB write |
| Usage status query nặng | `getUsageStatus()` query cả `CreditBalance` lẫn `Usage` table | Gọi nhiều lần mỗi render (billing page, usage widget) |
| Admin dashboard chậm | `getStats()`, `getUserActivity()` gọi Clerk API + DB aggregation | Mỗi lần load admin page mất 2-5 giây |
| PayOS webhook có thể xử lý 2 lần | Không có idempotency check nhanh | Có thể cộng credit 2 lần nếu PayOS retry |

Redis giải quyết tất cả bằng cách đặt một lớp in-memory trước PostgreSQL.

---

## Kiến trúc tổng quan

```
Request
   │
   ▼
┌──────────────────────────────────────────┐
│           Redis (in-memory)              │
│                                          │
│  ┌─────────────┐  ┌────────────────────┐ │
│  │ Rate Limiter│  │     Cache          │ │
│  │ (rlflx:*)   │  │ (usage:*, admin:*) │ │
│  └─────────────┘  └────────────────────┘ │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │     Idempotency Flags               │ │
│  │     (payos:processed:*)             │ │
│  └─────────────────────────────────────┘ │
└──────────────────────────────────────────┘
   │ Cache miss / Rate limit check
   ▼
┌──────────────────────────────────────────┐
│           PostgreSQL                     │
│  Project, Message, Fragment              │
│  Usage, CreditBalance, CreditPayment     │
└──────────────────────────────────────────┘
```

---

## Use Case 1: Rate Limiting

**File:** `src/lib/usage.ts`

### Vấn đề cũ

```typescript
// ❌ Trước: dùng RateLimiterPrisma
const prismaForRateLimit = new PrismaClient(); // PrismaClient thứ 2!
const usageTracker = new RateLimiterPrisma({
  storeClient: prismaForRateLimit,
  tableName: "Usage",
  points: 30,
  duration: CREDIT_DURATION,
});
```

Mỗi lần `consume()` → ghi vào bảng `Usage` trong PostgreSQL → chậm, tốn connection.

### Giải pháp Redis

```typescript
// ✅ Sau: dùng RateLimiterRedis
const usageTracker = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rlflx",
  points: 30,
  duration: CREDIT_DURATION,
});
```

### Cách hoạt động trong Redis

`rate-limiter-flexible` dùng Redis commands sau:

```
# Lần đầu consume (user chưa có key)
SET rlflx:user_abc 1 EX 2592000   # 2592000 = 30 ngày

# Các lần tiếp theo
INCRBY rlflx:user_abc 1           # Tăng điểm đã dùng
TTL rlflx:user_abc                # Kiểm tra còn bao lâu reset

# Khi hết điểm → throw RateLimiterRes (không phải Error thông thường)
```

Tất cả là **atomic** — không cần transaction, không race condition.

### Key format

```
rlflx:{userId}
```

Ví dụ: `rlflx:user_2a1b3c4d5e`

**TTL:** 30 ngày (tự reset khi key expire)

---

## Use Case 2: Cache Usage Status

**File:** `src/lib/usage.ts`, `src/lib/redis-cache.ts`

### Vấn đề

`getUsageStatusForUser()` được gọi ở nhiều nơi:
- `usage.status` tRPC query (hiển thị trên UI)
- `billing.summary` tRPC query (billing page)
- Sau mỗi `consumeCredits()`

Mỗi lần gọi → 2 DB queries song song:
```typescript
const [result, creditBalance] = await Promise.all([
  usageTracker.get(userId),        // Query Redis rate limiter
  prisma.creditBalance.findUnique(...), // Query PostgreSQL
]);
```

### Giải pháp: Cache-aside pattern

```typescript
export async function getUsageStatusForUser(userId: string) {
  return withCache(
    CACHE_KEYS.usageStatus(userId),  // "usage:status:{userId}"
    async () => {
      // Hàm này chỉ chạy khi cache miss
      const [result, creditBalance] = await Promise.all([...]);
      return { remainingPoints, paidCredits, freeCredits, ... };
    },
    { ttl: TTL.SHORT } // 10 giây
  );
}
```

### Flow chi tiết

```
getUsageStatusForUser("user_abc")
         │
         ▼
  GET usage:status:user_abc
         │
    ┌────┴────┐
    │         │
  HIT       MISS
    │         │
    │         ▼
    │   Query PostgreSQL + Redis rate limiter
    │         │
    │         ▼
    │   SET usage:status:user_abc <json> EX 10
    │         │
    └────┬────┘
         │
         ▼
   Return data
```

### Invalidation

Cache bị xóa ngay sau khi consume credits:

```typescript
export async function consumeCredits() {
  // ... consume logic ...

  // Xóa cache để lần query tiếp theo lấy số mới
  await invalidateCache(CACHE_KEYS.usageStatus(userId));
  // DEL usage:status:user_abc
}
```

**Trade-off:** Trong 10 giây sau khi consume, UI có thể hiển thị số cũ. Nhưng vì `invalidateCache` được gọi ngay sau consume, thực tế gần như không có độ trễ.

### Key format

```
usage:status:{userId}
```

Ví dụ: `usage:status:user_2a1b3c4d5e`

**TTL:** 10 giây

---

## Use Case 3: Cache Admin Dashboard

**File:** `src/trpc/routers/admin.ts`

### Vấn đề

Các query admin rất nặng:

```typescript
// getStats: 4 DB queries + N Clerk API calls
const [totalProjects, totalMessages, totalFragments, recentProjects] =
  await Promise.all([
    db.project.count(),
    db.message.count(),
    db.fragment.count(),
    db.project.findMany({ take: 10, ... }),
  ]);
// + gọi Clerk API cho từng project → N HTTP requests

// getUserActivity: gọi Clerk API lấy toàn bộ users
const allUsers = await client.users.getUserList({ limit: 500 });
```

Admin không cần real-time — data trễ 5 phút là chấp nhận được.

### Giải pháp

```typescript
getStats: protectedProcedure.query(async () => {
  await requireAdmin();

  return withCache(
    CACHE_KEYS.adminStats(),   // "admin:stats"
    async () => {
      // Toàn bộ logic query nặng ở đây
      // Chỉ chạy khi cache miss (mỗi 5 phút)
    },
    { ttl: TTL.LONG }  // 5 phút
  );
}),
```

### Queries được cache

| tRPC Procedure | Cache Key | TTL |
|----------------|-----------|-----|
| `admin.getStats` | `admin:stats` | 5 phút |
| `admin.getProjectsChart` | `admin:chart:{days}` | 5 phút |
| `admin.getMessagesStats` | `admin:messages:stats` | 5 phút |
| `admin.getUserActivity` | `admin:activity:{days}` | 5 phút |

### Queries KHÔNG cache

| tRPC Procedure | Lý do |
|----------------|-------|
| `admin.getProjects` | Có filter/search/pagination → cache key bùng nổ |
| `admin.getPayments` | Có filter/search/pagination |
| `admin.getUsers` | Có filter/search/pagination |

### Invalidation sau mutation

```typescript
updateUserRole: protectedProcedure.mutation(async ({ input }) => {
  // ... update logic ...

  // Xóa tất cả admin cache bằng SCAN pattern
  await invalidateCacheByPattern("admin:*");
  // Xóa: admin:stats, admin:chart:30, admin:chart:7, ...
}),
```

`invalidateCacheByPattern` dùng `SCAN` thay vì `KEYS` để không block Redis:

```typescript
// Dùng SCAN (non-blocking, batch 100 keys)
let cursor = "0";
do {
  const [nextCursor, keys] = await redis.scan(cursor, "MATCH", "admin:*", "COUNT", 100);
  cursor = nextCursor;
  if (keys.length > 0) await redis.del(...keys);
} while (cursor !== "0");
```

---

## Use Case 4: Idempotency cho PayOS Webhook

**File:** `src/app/api/webhooks/payos/route.ts`

### Vấn đề

PayOS có thể gửi cùng một webhook nhiều lần (retry khi server timeout, network error). Nếu không có idempotency check, cùng một payment có thể được xử lý 2 lần → cộng credit 2 lần.

### Giải pháp

```typescript
// 1. Check Redis trước khi xử lý
const idempotencyKey = CACHE_KEYS.payosProcessed(orderCodeStr);
// "payos:processed:12345678"

const alreadyProcessed = await existsInCache(idempotencyKey);
// EXISTS payos:processed:12345678 → 0 hoặc 1

if (alreadyProcessed) {
  return NextResponse.json({ received: true, ignored: true, reason: "duplicate" });
}

// 2. Xử lý payment...
const { applied } = await applyPaidCreditPayment(orderCode, body);

// 3. Set flag sau khi xử lý thành công
if (applied) {
  await setFlag(idempotencyKey, TTL.DAY);
  // SET payos:processed:12345678 "1" EX 86400
}
```

### Tại sao Redis tốt hơn chỉ dùng DB?

```
Với Redis:
  EXISTS payos:processed:12345678  → O(1), ~0.1ms, in-memory

Với DB:
  SELECT * FROM CreditPayment WHERE orderCode = 12345678  → ~5-20ms, disk I/O
```

**Defense in depth:** DB vẫn có check `status !== "PAID"` trong `applyPaidCreditPayment()` như lớp bảo vệ thứ 2.

### Key format

```
payos:processed:{orderCode}
```

Ví dụ: `payos:processed:123456789012`

**TTL:** 24 giờ (đủ để cover mọi retry từ PayOS, sau đó tự cleanup)

---

## Cấu trúc file

```
src/lib/
├── redis.ts          # Redis client singleton
└── redis-cache.ts    # Cache utilities
```

### `redis.ts` — Client singleton

```typescript
import Redis from "ioredis";

// Detect môi trường từ URL scheme
const isServerless = url.startsWith("rediss://");

const client = new Redis(url, {
  lazyConnect: isServerless,          // Không connect ngay trên serverless
  maxRetriesPerRequest: isServerless ? 1 : null,  // Fail nhanh trên Lambda
  connectTimeout: isServerless ? 5000 : 10000,
  enableAutoPipelining: !isServerless,
  tls: isServerless ? { rejectUnauthorized: true } : undefined,
});
```

### `redis-cache.ts` — Utilities

| Function | Redis Command | Mô tả |
|----------|---------------|-------|
| `withCache(key, fn, {ttl})` | `GET` → `SET key val EX ttl` | Cache-aside pattern |
| `invalidateCache(key)` | `DEL key` | Xóa 1 key |
| `invalidateCacheMany(keys)` | `DEL key1 key2 ...` | Xóa nhiều key |
| `invalidateCacheByPattern(pattern)` | `SCAN` + `DEL` | Xóa theo pattern |
| `existsInCache(key)` | `EXISTS key` | Kiểm tra key tồn tại |
| `setFlag(key, ttl)` | `SET key "1" EX ttl` | Set flag đơn giản |

### TTL Constants

```typescript
export const TTL = {
  SHORT:  10,        // 10 giây  — usage status
  MEDIUM: 60,        // 1 phút   — general cache
  LONG:   5 * 60,    // 5 phút   — admin dashboard
  HOUR:   60 * 60,   // 1 giờ
  DAY:    24 * 60 * 60, // 24 giờ — idempotency keys
};
```

### Cache Key Naming Convention

```typescript
export const CACHE_KEYS = {
  usageStatus:        (userId: string) => `usage:status:${userId}`,
  adminStats:         ()               => `admin:stats`,
  adminChart:         (days: number)   => `admin:chart:${days}`,
  adminMessagesStats: ()               => `admin:messages:stats`,
  adminUserActivity:  (days: number)   => `admin:activity:${days}`,
  payosProcessed:     (orderCode: string) => `payos:processed:${orderCode}`,
};
```

Pattern: `{feature}:{type}:{identifier}` — dễ đọc, dễ invalidate theo pattern.

---

## Setup

### Local Development

```bash
# Docker (khuyến nghị)
docker run -d -p 6379:6379 --name redis redis:alpine

# macOS Homebrew
brew install redis && brew services start redis

# Kiểm tra kết nối
redis-cli ping  # → PONG
```

`.env`:
```env
REDIS_URL="redis://localhost:6379"
```

### Production (Upstash trên Vercel)

1. Tạo database tại [console.upstash.com](https://console.upstash.com)
   - Region: `ap-southeast-1` (Singapore)
   - Type: Regional

2. Copy **Redis URL** dạng `rediss://:password@host:6379`

3. Thêm vào Vercel: Settings → Environment Variables
   ```
   REDIS_URL = rediss://default:AbCdEf...@ap1-xxx.upstash.io:6379
   ```

4. Code tự detect `rediss://` và bật TLS + serverless settings — không cần thay đổi gì thêm.

### Free Tier Upstash

| Giới hạn | Free | Dự án dùng |
|----------|------|------------|
| Requests/ngày | 10,000 | Rate limit + cache hits |
| Storage | 256MB | JSON nhỏ + flags |
| Connections | 100 concurrent | Serverless = ít concurrent |

---

## Debugging

### Xem tất cả keys đang có

```bash
redis-cli keys "*"
# hoặc theo pattern
redis-cli keys "admin:*"
redis-cli keys "usage:*"
redis-cli keys "payos:*"
```

### Xem giá trị và TTL của một key

```bash
redis-cli get "usage:status:user_abc"
redis-cli ttl "usage:status:user_abc"
```

### Xóa cache thủ công (khi debug)

```bash
# Xóa 1 key
redis-cli del "admin:stats"

# Xóa tất cả admin cache
redis-cli keys "admin:*" | xargs redis-cli del

# Xóa toàn bộ (cẩn thận!)
redis-cli flushall
```

### Xem rate limiter của một user

```bash
redis-cli get "rlflx:user_abc"   # Số điểm đã dùng
redis-cli ttl "rlflx:user_abc"   # Giây còn lại đến khi reset
```

---

## Tóm tắt Redis commands được dùng

| Command | Dùng ở đâu |
|---------|-----------|
| `GET key` | `withCache` — check cache |
| `SET key value EX seconds` | `withCache` — lưu cache; `setFlag` — idempotency |
| `DEL key [key ...]` | `invalidateCache`, `invalidateCacheMany` |
| `EXISTS key` | `existsInCache` — idempotency check |
| `SCAN cursor MATCH pattern COUNT n` | `invalidateCacheByPattern` |
| `INCRBY key n` | `RateLimiterRedis` — tăng điểm đã dùng |
| `TTL key` | `RateLimiterRedis` — kiểm tra thời gian reset |

---

**Last Updated:** May 30, 2026
