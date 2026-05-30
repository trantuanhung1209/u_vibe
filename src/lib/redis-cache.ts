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
  // Bọc trong try/catch: nếu Redis lỗi (timeout, connection refused, sai URL)
  // thì fallback về fetchFn thay vì throw — đảm bảo app vẫn hoạt động
  try {
    const cached = await redis.get(key);

    if (cached !== null) {
      return JSON.parse(cached) as T;
    }
  } catch (err) {
    // Redis không available → bỏ qua cache, lấy thẳng từ DB
    console.warn(`[Cache] Redis GET failed for "${key}", falling back to DB:`, (err as Error).message);
  }

  // 2. Cache miss hoặc Redis lỗi → gọi hàm lấy dữ liệu thật
  const data = await fetchFn();

  // 3. Thử lưu vào Redis — nếu lỗi thì bỏ qua, không ảnh hưởng response
  try {
    await redis.set(key, JSON.stringify(data), "EX", ttl);
  } catch (err) {
    console.warn(`[Cache] Redis SET failed for "${key}":`, (err as Error).message);
  }

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
  try {
    await redis.del(key);
  } catch (err) {
    console.warn(`[Cache] Redis DEL failed for "${key}":`, (err as Error).message);
  }
}

export async function invalidateCacheMany(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch (err) {
    console.warn(`[Cache] Redis DEL failed for keys:`, (err as Error).message);
  }
}

export async function invalidateCacheByPattern(pattern: string): Promise<void> {
  try {
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
  } catch (err) {
    console.warn(`[Cache] Redis SCAN/DEL failed for pattern "${pattern}":`, (err as Error).message);
  }
}

export async function existsInCache(key: string): Promise<boolean> {
  try {
    const count = await redis.exists(key);
    return count > 0;
  } catch (err) {
    console.warn(`[Cache] Redis EXISTS failed for "${key}":`, (err as Error).message);
    return false; // Fail-open: nếu Redis lỗi thì coi như chưa xử lý
  }
}

export async function setFlag(key: string, ttl: number): Promise<void> {
  try {
    await redis.set(key, "1", "EX", ttl);
  } catch (err) {
    console.warn(`[Cache] Redis SET flag failed for "${key}":`, (err as Error).message);
  }
}
