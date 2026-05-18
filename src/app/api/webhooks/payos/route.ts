import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/db";
import { getPayOS } from "@/lib/payos";
import { applyPaidCreditPayment } from "@/lib/payments/apply-credit-payment";

export const runtime = "nodejs";

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

  await prisma.creditPayment.update({
    where: { id: payment.id },
    data: {
      payosStatus: webhookData.desc,
      paymentLinkId: webhookData.paymentLinkId,
    },
  });

  const { applied, reason } = await applyPaidCreditPayment(orderCode, body);

  return NextResponse.json({ received: true, applied, reason });
}
