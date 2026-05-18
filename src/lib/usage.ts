import { RateLimiterPrisma } from "rate-limiter-flexible";
import { PrismaClient } from "@/generated/prisma/client";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

export const FREE_POINTS = 30;
export const CREDIT_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds
export const GENERATION_COST = 1; // Mỗi lần tạo tiêu thụ 1 điểm

// Tạo prisma client riêng không có adapter cho rate limiter
const prismaForRateLimit = new PrismaClient();

export async function getUsageTracker() {
  const usageTracker = new RateLimiterPrisma({
    storeClient: prismaForRateLimit,
    tableName: "Usage",
    points: FREE_POINTS, // Free quota reset theo chu kỳ
    duration: CREDIT_DURATION, // Thời gian (giây) để làm mới điểm
  });

  return usageTracker;
}

export async function getUsageStatusForUser(userId: string) {
  const usageTracker = await getUsageTracker();
  const [result, creditBalance] = await Promise.all([
    usageTracker.get(userId),
    prisma.creditBalance.findUnique({
      where: { userId },
    }),
  ]);

  const paidCredits = creditBalance?.credits ?? 0;
  const consumedFreePoints = result?.consumedPoints ?? 0;
  const freeCredits = result?.remainingPoints ?? usageTracker.points;
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
}

async function consumePaidCredits(userId: string) {
  const result = await prisma.creditBalance.updateMany({
    where: {
      userId,
      credits: {
        gte: GENERATION_COST,
      },
    },
    data: {
      credits: {
        decrement: GENERATION_COST,
      },
    },
  });

  return result.count > 0;
}

export async function consumeCredits() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const usedPaidCredit = await consumePaidCredits(userId);

  if (usedPaidCredit) {
    return getUsageStatus();
  }

  const usageTracker = await getUsageTracker();
  const result = await usageTracker.consume(userId, GENERATION_COST); // Tiêu thụ 1 điểm

  return result;
}

export async function getUsageStatus() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  return getUsageStatusForUser(userId);
}
