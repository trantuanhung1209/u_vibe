import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

import prisma from "@/lib/db";
import { getPayOS } from "@/lib/payos";
import { CREDIT_PACK } from "@/lib/payments/credits";

export const runtime = "nodejs";

function createOrderCode() {
  return BigInt(Date.now() * 1000 + Math.floor(Math.random() * 1000));
}

function getBaseUrl(req: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  const baseUrl = getBaseUrl(req);
  const orderCode = createOrderCode();

  const payment = await prisma.creditPayment.create({
    data: {
      orderCode,
      userId,
      amount: CREDIT_PACK.amount,
      credits: CREDIT_PACK.credits,
      description: CREDIT_PACK.description,
    },
  });

  try {
    const payOS = getPayOS();
    const paymentLink = await payOS.paymentRequests.create({
      orderCode: Number(orderCode),
      amount: CREDIT_PACK.amount,
      description: CREDIT_PACK.description,
      items: [
        {
          name: CREDIT_PACK.name,
          quantity: 1,
          price: CREDIT_PACK.amount,
        },
      ],
      buyerName: user?.fullName || undefined,
      buyerEmail: user?.emailAddresses.at(0)?.emailAddress,
      returnUrl: `${baseUrl}/api/payments/payos/return?orderCode=${orderCode.toString()}`,
      cancelUrl: `${baseUrl}/api/payments/payos/cancel?orderCode=${orderCode.toString()}`,
    });

    await prisma.creditPayment.update({
      where: { id: payment.id },
      data: {
        paymentLinkId: paymentLink.paymentLinkId,
        checkoutUrl: paymentLink.checkoutUrl,
        payosStatus: paymentLink.status,
      },
    });

    return NextResponse.json({ checkoutUrl: paymentLink.checkoutUrl });
  } catch (error) {
    await prisma.creditPayment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        rawData: {
          message: error instanceof Error ? error.message : "Create payment link failed",
        },
      },
    });

    return NextResponse.json(
      { error: "Could not create PayOS checkout link" },
      { status: 500 }
    );
  }
}
