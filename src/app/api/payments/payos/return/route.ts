import { NextRequest, NextResponse } from "next/server";

import { getPayOS } from "@/lib/payos";
import { applyPaidCreditPayment } from "@/lib/payments/apply-credit-payment";

export const runtime = "nodejs";

function getBaseUrl(req: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const redirectUrl = new URL("/billing", getBaseUrl(req));
  const orderCode = req.nextUrl.searchParams.get("orderCode");

  if (orderCode) {
    try {
      const paymentLink = await getPayOS().paymentRequests.get(Number(orderCode));

      if (paymentLink.status === "PAID") {
        await applyPaidCreditPayment(BigInt(orderCode), paymentLink);
        redirectUrl.searchParams.set("payment", "success");
        return NextResponse.redirect(redirectUrl);
      }
    } catch {
      redirectUrl.searchParams.set("payment", "pending");
      return NextResponse.redirect(redirectUrl);
    }
  }

  redirectUrl.searchParams.set("payment", "pending");

  return NextResponse.redirect(redirectUrl);
}
