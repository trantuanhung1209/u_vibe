import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import db from "@/lib/db";
import { CREDIT_PACK } from "@/lib/payments/credits";
import { getUsageStatusForUser } from "@/lib/usage";

export const billingRouter = createTRPCRouter({
  summary: protectedProcedure.query(async ({ ctx }) => {
    const [usageStatus, usage, payments] = await Promise.all([
      getUsageStatusForUser(ctx.auth.userId),
      db.usage.findUnique({ where: { key: ctx.auth.userId } }),
      db.creditPayment.findMany({
        where: { userId: ctx.auth.userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          orderCode: true,
          amount: true,
          credits: true,
          status: true,
          payosStatus: true,
          createdAt: true,
          paidAt: true,
        },
      }),
    ]);

    return {
      creditPack: CREDIT_PACK,
      usage: {
        consumedPoints: usageStatus.consumedPoints,
        remainingPoints: usageStatus.remainingPoints,
        msBeforeNext: usageStatus.msBeforeNext,
        paidCredits: usageStatus.paidCredits,
        freeCredits: usageStatus.freeCredits,
        isPro: usageStatus.isPro,
        expire: usage?.expire ?? null,
      },
      payments: payments.map((payment) => ({
        ...payment,
        orderCode: payment.orderCode.toString(),
      })),
    };
  }),
});
