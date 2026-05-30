/**
 * Redis Debug API
 *
 * Endpoint chỉ dành cho admin, trả về:
 * - Trạng thái kết nối Redis
 * - Memory usage
 * - Tất cả keys đang có (với TTL và giá trị)
 * - Server info
 *
 * GET /api/debug/redis
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import redis from "@/lib/redis";

export const runtime = "nodejs";

// Kiểu dữ liệu cho từng key entry
interface RedisKeyEntry {
  key: string;
  ttl: number;        // -1 = không expire, -2 = không tồn tại
  ttlLabel: string;   // Human-readable TTL
  type: string;       // string, hash, list, set, zset
  value: string | null;
  size: number;       // bytes
}

// Parse Redis INFO string thành object
function parseRedisInfo(info: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of info.split("\r\n")) {
    if (line && !line.startsWith("#")) {
      const [key, ...rest] = line.split(":");
      if (key && rest.length > 0) {
        result[key.trim()] = rest.join(":").trim();
      }
    }
  }
  return result;
}

// Format TTL thành chuỗi dễ đọc
function formatTTL(ttl: number): string {
  if (ttl === -1) return "no expiry";
  if (ttl === -2) return "expired/missing";
  if (ttl < 60) return `${ttl}s`;
  if (ttl < 3600) return `${Math.floor(ttl / 60)}m ${ttl % 60}s`;
  if (ttl < 86400) return `${Math.floor(ttl / 3600)}h ${Math.floor((ttl % 3600) / 60)}m`;
  return `${Math.floor(ttl / 86400)}d ${Math.floor((ttl % 86400) / 3600)}h`;
}

// Phân loại key theo prefix để hiển thị nhóm
function categorizeKey(key: string): string {
  if (key.startsWith("rlflx:")) return "rate-limiter";
  if (key.startsWith("usage:status:")) return "usage-cache";
  if (key.startsWith("admin:")) return "admin-cache";
  if (key.startsWith("payos:processed:")) return "idempotency";
  return "other";
}

export async function GET() {
  // Chỉ admin mới được xem
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ── 1. Ping để kiểm tra kết nối ─────────────────────────────────────────
    const pingStart = Date.now();
    await redis.ping();
    const pingMs = Date.now() - pingStart;

    // ── 2. Lấy server info ───────────────────────────────────────────────────
    // INFO trả về string dạng "key:value\r\n..."
    const infoRaw = await redis.info();
    const info = parseRedisInfo(infoRaw);

    // ── 3. Lấy tất cả keys theo từng nhóm ───────────────────────────────────
    // Dùng SCAN thay vì KEYS để không block Redis
    const allKeys: string[] = [];
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(cursor, "COUNT", 100);
      cursor = nextCursor;
      allKeys.push(...keys);
    } while (cursor !== "0");

    // ── 4. Lấy TTL, type, value cho từng key ────────────────────────────────
    // Dùng pipeline để gửi tất cả commands cùng lúc — hiệu quả hơn gọi từng cái
    const keyEntries: RedisKeyEntry[] = await Promise.all(
      allKeys.map(async (key) => {
        // Pipeline: TTL + TYPE + GET trong 1 round-trip
        const pipeline = redis.pipeline();
        pipeline.ttl(key);
        pipeline.type(key);
        pipeline.get(key); // Chỉ hoạt động với type "string"
        const results = await pipeline.exec();

        const ttl = (results?.[0]?.[1] as number) ?? -2;
        const type = (results?.[1]?.[1] as string) ?? "unknown";
        const rawValue = results?.[2]?.[1] as string | null;

        // Truncate value dài để không làm nặng response
        let value = rawValue;
        if (value && value.length > 200) {
          value = value.slice(0, 200) + "... [truncated]";
        }

        return {
          key,
          ttl,
          ttlLabel: formatTTL(ttl),
          type,
          value,
          size: rawValue ? Buffer.byteLength(rawValue, "utf8") : 0,
          category: categorizeKey(key),
        };
      })
    );

    // Sort: nhóm theo category, rồi theo key name
    keyEntries.sort((a, b) => {
      const catA = categorizeKey(a.key);
      const catB = categorizeKey(b.key);
      if (catA !== catB) return catA.localeCompare(catB);
      return a.key.localeCompare(b.key);
    });

    // ── 5. Tổng hợp stats ────────────────────────────────────────────────────
    const categories = keyEntries.reduce<Record<string, number>>((acc, entry) => {
      const cat = categorizeKey(entry.key);
      acc[cat] = (acc[cat] ?? 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      status: "connected",
      ping: `${pingMs}ms`,
      server: {
        version: info["redis_version"] ?? "unknown",
        mode: info["redis_mode"] ?? "standalone",
        uptime: `${Math.floor(Number(info["uptime_in_seconds"] ?? 0) / 3600)}h`,
        connectedClients: info["connected_clients"] ?? "?",
        usedMemory: info["used_memory_human"] ?? "?",
        maxMemory: info["maxmemory_human"] ?? "no limit",
        totalCommandsProcessed: info["total_commands_processed"] ?? "?",
        keyspaceHits: info["keyspace_hits"] ?? "0",
        keyspaceMisses: info["keyspace_misses"] ?? "0",
      },
      summary: {
        totalKeys: allKeys.length,
        categories,
      },
      keys: keyEntries,
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
