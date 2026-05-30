/**
 * Usage & Rate Limiting
 *
 * Redis được dùng ở đây theo 2 cách:
 *
 * 1. RATE LIMITER (RateLimiterRedis)
 *    - Thay thế RateLimiterPrisma — nhanh hơn ~10x vì Redis in-memory
 *    - rate-limiter-flexible dùng Redis MULTI/EXEC (transaction) để đảm bảo
 *      atomic increment, tránh race condition khi nhiều request đồng thời
 *    - Key trong Redis: "rlflx:{userId}" với TTL = CREDIT_DURATION
 *
 * 2. CACHE (withCache)
 *    - Cache kết quả getUsageStatusForUser() với TTL ngắn (10 giây)
 *    - Tránh query cả CreditBalance lẫn Usage table mỗi lần render
 *    - Invalidate cache ngay sau khi consumeCredits() để đảm bảo consistency
 */

import { RateLimiterRedis } from "rate-limiter-flexible";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import redis from "@/lib/redis";
import { withCache, invalidateCache, CACHE_KEYS, TTL } from "@/lib/redis-cache";

export const FREE_POINTS = 30;
export const CREDIT_DURATION = 30 * 24 * 60 * 60; // 30 ngày tính bằng giây
export const GENERATION_COST = 1;

/**
 * Tạo RateLimiterRedis instance.
 *
 * Khác với RateLimiterPrisma (ghi vào PostgreSQL), RateLimiterRedis:
 * - Dùng Redis INCRBY + EXPIRE để track điểm đã dùng
 * - Atomic: không cần transaction DB
 * - Nhanh hơn nhiều lần vì Redis in-memory
 *
 * Key format trong Redis: "rlflx:{userId}"
 */
export function getUsageTracker() {
  return new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: "rlflx", // prefix cho key trong Redis
    points: FREE_POINTS,
    duration: CREDIT_DURATION,
  });
}

/**
 * Lấy usage status của một user.
 *
 * Kết quả được cache trong Redis với TTL 10 giây.
 * Điều này có nghĩa là sau khi consume credits, UI có thể
 * hiển thị số cũ tối đa 10 giây — đây là trade-off chấp nhận được.
 *
 * Để đảm bảo consistency hơn, hàm consumeCredits() sẽ
 * invalidate cache ngay sau khi consume thành công.
 */
export async function getUsageStatusForUser(userId: string) {
  return withCache(
    CACHE_KEYS.usageStatus(userId),
    async () => {
      const usageTracker = getUsageTracker();

      // Chạy song song: lấy rate limit status + credit balance
      // usageTracker.get() có thể throw nếu Redis lỗi → bắt riêng
      const [result, creditBalance] = await Promise.all([
        usageTracker.get(userId).catch(() => null), // Redis lỗi → coi như chưa dùng gì
        prisma.creditBalance.findUnique({ where: { userId } }),
      ]);

      const paidCredits = creditBalance?.credits ?? 0;
      const consumedFreePoints = result?.consumedPoints ?? 0;
      const freeCredits = result?.remainingPoints ?? FREE_POINTS;
      const msBeforeNext = result?.msBeforeNext ?? CREDIT_DURATION * 1000;

      return {
        remainingPoints: paidCredits + freeCredits,
        consumedPoints: consumedFreePoints,
        msBeforeNext,
        isFirstInDuration: result?.isFirstInDuration ?? true,
        paidCredits,
        freeCredits,
        isPro: paidCredits > 0,
      };
    },
    { ttl: TTL.SHORT }
  );
}

/**
 * Trừ paid credits từ CreditBalance table.
 * Dùng updateMany với điều kiện credits >= GENERATION_COST
 * để đảm bảo atomic — không cần lock thêm.
 */
async function consumePaidCredits(userId: string): Promise<boolean> {
  const result = await prisma.creditBalance.updateMany({
    where: {
      userId,
      credits: { gte: GENERATION_COST },
    },
    data: {
      credits: { decrement: GENERATION_COST },
    },
  });

  return result.count > 0;
}

/**
 * Consume credits theo thứ tự ưu tiên:
 * 1. Paid credits (CreditBalance) — dùng trước
 * 2. Free credits (RateLimiterRedis) — dùng khi hết paid
 *
 * Sau khi consume thành công, invalidate cache để
 * lần query tiếp theo lấy dữ liệu mới nhất.
 */
export async function consumeCredits() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  // Thử dùng paid credits trước
  const usedPaidCredit = await consumePaidCredits(userId);

  if (usedPaidCredit) {
    // Invalidate cache ngay sau khi consume
    // Lần query tiếp theo sẽ lấy số credits mới từ DB
    await invalidateCache(CACHE_KEYS.usageStatus(userId));
    return getUsageStatus();
  }

  // Không có paid credits → dùng free credits qua Redis rate limiter
  const usageTracker = getUsageTracker();

  // consume() sẽ throw RateLimiterRes nếu hết điểm
  // Caller (procedures.ts) sẽ catch và throw TRPCError
  const result = await usageTracker.consume(userId, GENERATION_COST);

  // Invalidate cache sau khi consume free credits
  await invalidateCache(CACHE_KEYS.usageStatus(userId));

  return result;
}

/**
 * Lấy usage status của user hiện tại (từ Clerk auth).
 */
export async function getUsageStatus() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  return getUsageStatusForUser(userId);
}
