import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const redirectUrl = new URL("/pricing", req.nextUrl.origin);
  redirectUrl.searchParams.set("payment", "success");

  return NextResponse.redirect(redirectUrl);
}
