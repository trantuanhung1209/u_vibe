/**
 * PayOS Webhook Handler
 *
 * Redis được dùng để implement Idempotency (xử lý đúng một lần).
 *
 * Vấn đề: PayOS có thể gửi cùng một webhook nhiều lần
 * (retry khi server timeout, network error, v.v.)
 *
 * Giải pháp với Redis:
 * 1. Khi nhận webhook, kiểm tra key "payos:processed:{orderCode}" trong Redis
 * 2. Nếu key tồn tại → đã xử lý rồi → trả về 200 ngay, bỏ qua
 * 3. Nếu chưa có → xử lý bình thường → set key vào Redis với TTL 24h
 *
 * Tại sao Redis tốt hơn chỉ dùng DB?
 * - Redis check là O(1) in-memory, nhanh hơn DB query nhiều lần
 * - Giảm tải cho PostgreSQL
 * - TTL tự động cleanup sau 24h
 *
 * Lưu ý: DB vẫn có check status === "PAID" như một lớp bảo vệ thứ 2
 * (defense in depth) trong applyPaidCreditPayment().
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getPayOS } from "@/lib/payos";
import { applyPaidCreditPayment } from "@/lib/payments/apply-credit-payment";
import { existsInCache, setFlag, CACHE_KEYS, TTL } from "@/lib/redis-cache";

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
  const orderCodeStr = orderCode.toString();
  const isPaid = body.success === true && webhookData.code === "00";

  // ── Idempotency check ──────────────────────────────────────────────────────
  // Chỉ check idempotency cho webhook thành công (isPaid = true)
  // Webhook thất bại có thể retry hợp lệ
  if (isPaid) {
    const idempotencyKey = CACHE_KEYS.payosProcessed(orderCodeStr);
    const alreadyProcessed = await existsInCache(idempotencyKey);

    if (alreadyProcessed) {
      // Đã xử lý rồi — trả về 200 để PayOS không retry nữa
      console.log(`[PayOS Webhook] Duplicate webhook ignored: orderCode=${orderCodeStr}`);
      return NextResponse.json({ received: true, ignored: true, reason: "duplicate" });
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

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

  // ── Set idempotency flag sau khi xử lý thành công ─────────────────────────
  // TTL 24h: đủ để cover mọi retry từ PayOS
  // Sau 24h Redis tự xóa key — không cần cleanup thủ công
  if (applied) {
    await setFlag(CACHE_KEYS.payosProcessed(orderCodeStr), TTL.DAY);
    console.log(`[PayOS Webhook] Payment applied: orderCode=${orderCodeStr}`);
  }
  // ──────────────────────────────────────────────────────────────────────────

  return NextResponse.json({ received: true, applied, reason });
}
