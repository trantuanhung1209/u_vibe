/**
 * Redis Cache Utilities
 *
 * Cung cấp các helper function để cache dữ liệu trong Redis.
 *
 * Các khái niệm Redis được dùng ở đây:
 *
 * - SET key value EX seconds  → lưu giá trị với TTL (Time To Live)
 * - GET key                   → lấy giá trị
 * - DEL key [key ...]         → xóa một hoặc nhiều key
 * - KEYS pattern              → tìm tất cả key theo pattern (dùng cẩn thận ở production)
 *
 * TTL (Time To Live): sau khi hết TTL, Redis tự động xóa key.
 * Đây là cơ chế cache invalidation đơn giản nhất.
 */

import redis from "./redis";

// ─── Kiểu dữ liệu ────────────────────────────────────────────────────────────

type CacheOptions = {
  /** TTL tính bằng giây. Mặc định 60 giây */
  ttl?: number;
};

// ─── TTL constants — dễ đọc, dễ thay đổi ────────────────────────────────────

export const TTL = {
  /** 10 giây — dùng cho dữ liệu thay đổi thường xuyên (usage status) */
  SHORT: 10,
  /** 60 giây — dùng cho dữ liệu thay đổi vừa phải */
  MEDIUM: 60,
  /** 5 phút — dùng cho admin dashboard */
  LONG: 5 * 60,
  /** 1 giờ — dùng cho dữ liệu ít thay đổi */
  HOUR: 60 * 60,
  /** 24 giờ — dùng cho idempotency keys */
  DAY: 24 * 60 * 60,
} as const;

// ─── Key prefix — tránh collision giữa các feature ───────────────────────────

export const CACHE_KEYS = {
  /** Usage status của một user: usage:status:{userId} */
  usageStatus: (userId: string) => `usage:status:${userId}`,

  /** Admin stats tổng quan (không phụ thuộc input) */
  adminStats: () => `admin:stats`,

  /** Admin projects chart theo số ngày: admin:chart:{days} */
  adminChart: (days: number) => `admin:chart:${days}`,

  /** Admin messages stats */
  adminMessagesStats: () => `admin:messages:stats`,

  /** Admin user activity theo số ngày: admin:activity:{days} */
  adminUserActivity: (days: number) => `admin:activity:${days}`,

  /** Idempotency key cho PayOS webhook: payos:processed:{orderCode} */
  payosProcessed: (orderCode: string) => `payos:processed:${orderCode}`,
} as const;

// ─── Core helpers ─────────────────────────────────────────────────────────────

/**
 * Cache-aside pattern:
 * 1. Thử lấy từ Redis
 * 2. Nếu có (cache hit) → trả về ngay
 * 3. Nếu không (cache miss) → gọi fetchFn, lưu vào Redis, trả về
 *
 * @example
 * const data = await withCache(
 *   CACHE_KEYS.adminStats(),
 *   () => db.project.count(),
 *   { ttl: TTL.LONG }
 * );
 */
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = TTL.MEDIUM } = options;

  // 1. Thử lấy từ cache
  const cached = await redis.get(key);

  if (cached !== null) {
    // Cache hit: parse JSON và trả về
    // console.log(`[Cache HIT] ${key}`);
    return JSON.parse(cached) as T;
  }

  // Cache miss: gọi hàm lấy dữ liệu thật
  // console.log(`[Cache MISS] ${key}`);
  const data = await fetchFn();

  // Lưu vào Redis với TTL
  // JSON.stringify vì Redis chỉ lưu string
  await redis.set(key, JSON.stringify(data), "EX", ttl);

  return data;
}

/**
 * Xóa một cache key cụ thể.
 * Dùng sau khi mutation để invalidate cache.
 *
 * @example
 * await invalidateCache(CACHE_KEYS.usageStatus(userId));
 */
export async function invalidateCache(key: string): Promise<void> {
  await redis.del(key);
}

/**
 * Xóa nhiều cache keys cùng lúc.
 *
 * @example
 * await invalidateCacheMany([
 *   CACHE_KEYS.adminStats(),
 *   CACHE_KEYS.adminChart(30),
 * ]);
 */
export async function invalidateCacheMany(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  // DEL nhận nhiều key cùng lúc — hiệu quả hơn gọi DEL nhiều lần
  await redis.del(...keys);
}

/**
 * Xóa tất cả cache keys theo pattern.
 * Dùng SCAN thay vì KEYS để không block Redis ở production.
 *
 * @example
 * await invalidateCacheByPattern("admin:*");
 */
export async function invalidateCacheByPattern(pattern: string): Promise<void> {
  // SCAN cursor COUNT 100 MATCH pattern
  // Duyệt qua tất cả keys theo từng batch, không block server
  let cursor = "0";

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      100
    );
    cursor = nextCursor;

    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== "0");
}

/**
 * Kiểm tra một key có tồn tại trong Redis không.
 * Dùng cho idempotency check.
 *
 * @example
 * const alreadyProcessed = await existsInCache("payos:processed:12345");
 */
export async function existsInCache(key: string): Promise<boolean> {
  // EXISTS trả về số lượng key tồn tại (0 hoặc 1)
  const count = await redis.exists(key);
  return count > 0;
}

/**
 * Set một key với TTL mà không cần giá trị phức tạp.
 * Dùng cho idempotency keys, flags, locks đơn giản.
 *
 * @example
 * await setFlag("payos:processed:12345", TTL.DAY);
 */
export async function setFlag(key: string, ttl: number): Promise<void> {
  // SET key "1" EX ttl
  await redis.set(key, "1", "EX", ttl);
}
