/**
 * Redis Client Singleton
 *
 * Hỗ trợ 2 môi trường:
 *
 * LOCAL (dev):
 *   REDIS_URL="redis://localhost:6379"
 *   → Kết nối thẳng, không TLS
 *
 * PRODUCTION (Upstash / Redis Cloud trên Vercel):
 *   REDIS_URL="rediss://:password@host:port"
 *   → TLS (rediss://), serverless-optimized
 *
 * Tại sao cần config khác nhau cho serverless?
 * Vercel chạy mỗi request trong một Lambda function riêng biệt.
 * Không có "server" persistent → mỗi Lambda tạo connection mới.
 * Nếu không config đúng, connection sẽ bị treo hoặc timeout.
 *
 * Các setting quan trọng cho serverless:
 * - lazyConnect: true       → không connect ngay khi khởi tạo, connect khi dùng
 * - enableAutoPipelining    → tắt vì serverless không benefit từ pipelining
 * - maxRetriesPerRequest: 1 → fail nhanh thay vì retry mãi (Lambda có timeout)
 * - connectTimeout          → giới hạn thời gian connect
 */

import Redis from "ioredis";

const globalForRedis = global as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL;

  if (!url) {
    throw new Error(
      "REDIS_URL is not defined. " +
      "Local: redis://localhost:6379 | Upstash: rediss://:password@host:port"
    );
  }

  // Detect môi trường dựa vào URL scheme
  // rediss:// = TLS = production (Upstash, Redis Cloud)
  // redis://  = plain = local development
  const isServerless = url.startsWith("rediss://");

  const client = new Redis(url, {
    // ── Serverless settings ──────────────────────────────────────────────────
    // lazyConnect: không tạo connection ngay, chỉ connect khi có lệnh đầu tiên
    // Quan trọng trên serverless vì Lambda có thể bị reuse hoặc tạo mới
    lazyConnect: isServerless,

    // maxRetriesPerRequest: số lần retry mỗi command trước khi throw error
    // null = retry mãi (tốt cho long-running server)
    // 1    = fail nhanh (tốt cho serverless Lambda có timeout 10-30s)
    maxRetriesPerRequest: isServerless ? 1 : null,

    // connectTimeout: thời gian tối đa để tạo connection (ms)
    // Serverless cần fail nhanh nếu Redis không available
    connectTimeout: isServerless ? 5000 : 10000,

    // enableAutoPipelining: gom nhiều command vào 1 batch để gửi cùng lúc
    // Tốt cho server thường, nhưng không cần thiết trên serverless
    // (mỗi Lambda thường chỉ chạy 1-2 Redis commands)
    enableAutoPipelining: !isServerless,

    // TLS config cho rediss:// (Upstash yêu cầu)
    // tls: {} = dùng TLS với default settings
    ...(isServerless && {
      tls: {
        // rejectUnauthorized: true = verify SSL certificate (bảo mật)
        // Upstash và Redis Cloud đều có valid certificate
        rejectUnauthorized: true,
      },
    }),

    // ── Retry strategy ───────────────────────────────────────────────────────
    // Hàm này quyết định sau bao lâu thì retry khi mất kết nối
    // times = số lần đã retry
    // return null = dừng retry (dùng cho serverless)
    // return số ms = chờ rồi retry
    retryStrategy(times) {
      if (isServerless) {
        // Serverless: chỉ retry 2 lần, sau đó fail
        // Lambda không nên chờ quá lâu
        if (times > 2) return null;
        return times * 200; // 200ms, 400ms
      }
      // Local dev: retry với exponential backoff, tối đa 3 giây
      return Math.min(times * 100, 3000);
    },
  });

  // ── Event listeners ──────────────────────────────────────────────────────
  client.on("connect", () => {
    console.log(`[Redis] Connected (${isServerless ? "serverless/TLS" : "local"})`);
  });

  client.on("error", (err) => {
    // Không throw ở đây — chỉ log
    // Caller sẽ nhận error khi thực hiện command
    console.error("[Redis] Error:", err.message);
  });

  client.on("reconnecting", () => {
    console.log("[Redis] Reconnecting...");
  });

  return client;
}

// ── Singleton pattern ────────────────────────────────────────────────────────
// Dev: tái sử dụng connection giữa các hot-reload
// Production (serverless): mỗi Lambda instance có 1 connection riêng,
// nhưng nếu Lambda được reuse thì connection cũng được reuse → tiết kiệm
export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export default redis;
