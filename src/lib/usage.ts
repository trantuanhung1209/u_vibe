import { RateLimiterPrisma } from "rate-limiter-flexible";
import { PrismaClient } from "@/generated/prisma/client";
import { auth } from "@clerk/nextjs/server";

const FREE_POINTS = 30;
const PRO_POINTS = 100;
const FREE_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds
const GENERATION_COST = 1; // Mỗi lần tạo tiêu thụ 1 điểm

// Tạo prisma client riêng không có adapter cho rate limiter
const prismaForRateLimit = new PrismaClient();

export async function getUsageTracker() {
  const { has } = await auth();
  const hasPremiumAccess = has({ plan: "pro" });

  const usageTracker = new RateLimiterPrisma({
    storeClient: prismaForRateLimit,
    tableName: "Usage",
    points: hasPremiumAccess ? PRO_POINTS : FREE_POINTS, // Số điểm tối đa
    duration: FREE_DURATION, // Thời gian (giây) để làm mới điểm
  });

  return usageTracker;
}

export async function consumeCredits() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not authenticated");
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

  const usageTracker = await getUsageTracker();
  const result = await usageTracker.get(userId);

  return result;
}
