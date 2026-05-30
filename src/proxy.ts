/**
 * Next.js 16 Proxy (trước đây là middleware.ts)
 *
 * Next.js 16 đổi tên convention: middleware.ts → proxy.ts
 * Chức năng hoàn toàn giống nhau, chỉ khác tên file và export name.
 *
 * Thay đổi:
 * - File: src/middleware.ts → src/proxy.ts
 * - Export: `export default` → `export { proxy as default }` hoặc `export { proxy }`
 *
 * Clerk vẫn dùng clerkMiddleware() — API không thay đổi.
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ClerkSessionClaims } from "@/types/roles";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/",
  "/sign-up(.*)",
  "/api(.*)",
  "/pricing",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export const proxy = clerkMiddleware(async (auth, req) => {
  // Kiểm tra nếu là route public thì cho qua
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Protect tất cả các route không public
  await auth.protect();

  // Kiểm tra admin routes
  if (isAdminRoute(req)) {
    const { sessionClaims } = await auth();
    const role = (sessionClaims as ClerkSessionClaims)?.metadata?.role;

    // Chỉ admin mới được truy cập
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
});

export default proxy;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
