import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  const orderCode = req.nextUrl.searchParams.get("orderCode");

  if (orderCode) {
    try {
      await prisma.creditPayment.updateMany({
        where: {
          orderCode: BigInt(orderCode),
          status: "PENDING",
        },
        data: {
          status: "CANCELLED",
        },
      });
    } catch {
      // Ignore malformed order codes and still return the user to pricing.
    }
  }

  const redirectUrl = new URL("/pricing", req.nextUrl.origin);
  redirectUrl.searchParams.set("payment", "cancelled");

  return NextResponse.redirect(redirectUrl);
}
