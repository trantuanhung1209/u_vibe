import "server-only";

import prisma from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export async function applyPaidCreditPayment(
  orderCode: bigint,
  rawData: Prisma.InputJsonValue
) {
  const payment = await prisma.creditPayment.findUnique({
    where: { orderCode },
  });

  if (!payment) {
    return { applied: false, reason: "not_found" };
  }

  if (payment.status === "PAID") {
    return { applied: false, reason: "already_paid" };
  }

  const applied = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.creditPayment.updateMany({
      where: {
        id: payment.id,
        status: {
          not: "PAID",
        },
      },
      data: {
        status: "PAID",
        rawData,
        paidAt: new Date(),
      },
    });

    if (updatedPayment.count === 0) {
      return false;
    }

    await tx.creditBalance.upsert({
      where: { userId: payment.userId },
      create: {
        userId: payment.userId,
        credits: payment.credits,
      },
      update: {
        credits: {
          increment: payment.credits,
        },
      },
    });

    return true;
  });

  return { applied, reason: applied ? "applied" : "already_paid" };
}
