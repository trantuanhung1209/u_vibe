import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/db";
import { getPayOS } from "@/lib/payos";
import { CREDIT_PAYMENT_DURATION_DAYS } from "@/lib/payments/credits";

export const runtime = "nodejs";

function getCreditExpiry() {
  return new Date(Date.now() + CREDIT_PAYMENT_DURATION_DAYS * 24 * 60 * 60 * 1000);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  let webhookData;

  try {
    webhookData = await getPayOS().webhooks.verify(body);
  } catch {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  const orderCode = BigInt(webhookData.orderCode);
  const isPaid = body.success === true && webhookData.code === "00";

  const payment = await prisma.creditPayment.findUnique({
    where: { orderCode },
  });

  if (!payment) {
    return NextResponse.json({ received: true, ignored: true });
  }

  if (!isPaid) {
    await prisma.creditPayment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        payosStatus: webhookData.desc,
        rawData: body,
      },
    });

    return NextResponse.json({ received: true });
  }

  if (payment.status === "PAID") {
    return NextResponse.json({ received: true, duplicated: true });
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
        payosStatus: webhookData.desc,
        paymentLinkId: webhookData.paymentLinkId,
        rawData: body,
        paidAt: new Date(),
      },
    });

    if (updatedPayment.count === 0) {
      return false;
    }

    const currentUsage = await tx.usage.findUnique({
      where: { key: payment.userId },
    });

    const now = new Date();
    const shouldResetUsage =
      !currentUsage?.expire || currentUsage.expire <= now;

    await tx.usage.upsert({
      where: { key: payment.userId },
      create: {
        key: payment.userId,
        points: -payment.credits,
        expire: getCreditExpiry(),
      },
      update: {
        points: shouldResetUsage
          ? -payment.credits
          : (currentUsage?.points ?? 0) - payment.credits,
        expire: shouldResetUsage ? getCreditExpiry() : currentUsage?.expire,
      },
    });

    return true;
  });

  return NextResponse.json({ received: true, applied });
}
