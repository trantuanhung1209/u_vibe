"use client";

/**
 * Redis Debug Panel
 *
 * Component hiển thị trạng thái Redis real-time trên admin dashboard.
 * Giúp quan sát:
 * - Kết nối và latency
 * - Memory usage
 * - Cache hit/miss ratio
 * - Tất cả keys đang có với TTL và giá trị
 *
 * Tự động refresh mỗi 5 giây để thấy TTL đếm ngược.
 */

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw,
  Wifi,
  WifiOff,
  Database,
  Clock,
  Zap,
  MemoryStick,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RedisKeyEntry {
  key: string;
  ttl: number;
  ttlLabel: string;
  type: string;
  value: string | null;
  size: number;
  category: string;
}

interface RedisDebugData {
  status: "connected" | "error";
  ping: string;
  error?: string;
  server: {
    version: string;
    mode: string;
    uptime: string;
    connectedClients: string;
    usedMemory: string;
    maxMemory: string;
    totalCommandsProcessed: string;
    keyspaceHits: string;
    keyspaceMisses: string;
  };
  summary: {
    totalKeys: number;
    categories: Record<string, number>;
  };
  keys: RedisKeyEntry[];
}

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; description: string }
> = {
  "rate-limiter": {
    label: "Rate Limiter",
    color: "bg-orange-500/10 text-orange-600 border-orange-200",
    description: "Free credit quota per user (RateLimiterRedis)",
  },
  "usage-cache": {
    label: "Usage Cache",
    color: "bg-blue-500/10 text-blue-600 border-blue-200",
    description: "Cached usage status (TTL: 10s)",
  },
  "admin-cache": {
    label: "Admin Cache",
    color: "bg-purple-500/10 text-purple-600 border-purple-200",
    description: "Cached admin dashboard data (TTL: 5min)",
  },
  idempotency: {
    label: "Idempotency",
    color: "bg-green-500/10 text-green-600 border-green-200",
    description: "PayOS webhook processed flags (TTL: 24h)",
  },
  other: {
    label: "Other",
    color: "bg-gray-500/10 text-gray-600 border-gray-200",
    description: "Other keys",
  },
};

// ── TTL Bar — hiển thị thời gian còn lại ─────────────────────────────────────

function TTLBar({ ttl, maxTTL }: { ttl: number; maxTTL: number }) {
  if (ttl <= 0) return null;
  const pct = Math.min((ttl / maxTTL) * 100, 100);
  const color =
    pct > 60 ? "bg-green-500" : pct > 30 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-1000 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Key Row ───────────────────────────────────────────────────────────────────

function KeyRow({ entry }: { entry: RedisKeyEntry }) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORY_CONFIG[entry.category] ?? CATEGORY_CONFIG.other;

  // Max TTL theo category để tính % bar
  const maxTTL =
    entry.category === "rate-limiter"
      ? 30 * 24 * 3600
      : entry.category === "usage-cache"
      ? 10
      : entry.category === "admin-cache"
      ? 5 * 60
      : entry.category === "idempotency"
      ? 24 * 3600
      : 3600;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        )}

        {/* Key name */}
        <code className="text-xs font-mono flex-1 truncate">{entry.key}</code>

        {/* Category badge */}
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0 ${cat.color}`}
        >
          {cat.label}
        </span>

        {/* TTL */}
        <span className="text-xs text-muted-foreground shrink-0 w-24 text-right">
          <Clock className="w-3 h-3 inline mr-1" />
          {entry.ttlLabel}
        </span>
      </button>

      {/* TTL progress bar */}
      {entry.ttl > 0 && (
        <div className="px-3 pb-1">
          <TTLBar ttl={entry.ttl} maxTTL={maxTTL} />
        </div>
      )}

      {/* Expanded: value */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t bg-muted/30">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Type: {entry.type}
            </span>
            {entry.size > 0 && (
              <span className="text-[10px] text-muted-foreground">
                · {entry.size} bytes
              </span>
            )}
          </div>
          {entry.value ? (
            <pre className="text-xs bg-background border rounded p-2 overflow-x-auto max-h-40 overflow-y-auto">
              {(() => {
                // Thử parse JSON để hiển thị đẹp hơn
                try {
                  return JSON.stringify(JSON.parse(entry.value), null, 2);
                } catch {
                  return entry.value;
                }
              })()}
            </pre>
          ) : (
            <span className="text-xs text-muted-foreground italic">
              (no string value — type: {entry.type})
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function RedisDebugPanel() {
  const [data, setData] = useState<RedisDebugData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/debug/redis");
      const json = await res.json();
      setData(json);
      setLastFetch(new Date());
    } catch {
      setData({
        status: "error",
        error: "Failed to fetch Redis debug data",
      } as RedisDebugData);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh mỗi 5 giây
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Group keys theo category
  const keysByCategory =
    data?.keys.reduce<Record<string, RedisKeyEntry[]>>((acc, key) => {
      const cat = key.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(key);
      return acc;
    }, {}) ?? {};

  // Hit rate
  const hits = Number(data?.server.keyspaceHits ?? 0);
  const misses = Number(data?.server.keyspaceMisses ?? 0);
  const total = hits + misses;
  const hitRate = total > 0 ? Math.round((hits / total) * 100) : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            <CardTitle className="text-base">Redis Monitor</CardTitle>
            {data && (
              <Badge
                variant="outline"
                className={
                  data.status === "connected"
                    ? "text-green-600 border-green-300 bg-green-50"
                    : "text-red-600 border-red-300 bg-red-50"
                }
              >
                {data.status === "connected" ? (
                  <Wifi className="w-3 h-3 mr-1" />
                ) : (
                  <WifiOff className="w-3 h-3 mr-1" />
                )}
                {data.status}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {lastFetch && (
              <span className="text-xs text-muted-foreground">
                {lastFetch.toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh((v) => !v)}
              className={autoRefresh ? "text-green-600" : ""}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1 ${autoRefresh ? "animate-spin" : ""}`}
                style={autoRefresh ? { animationDuration: "3s" } : {}}
              />
              {autoRefresh ? "Auto" : "Manual"}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data?.status === "error" ? (
          <div className="flex items-center gap-2 text-red-600 text-sm p-3 bg-red-50 rounded-lg border border-red-200">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>{data.error}</span>
          </div>
        ) : data ? (
          <>
            {/* ── Server Stats ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Zap className="w-3 h-3" />
                  Latency
                </div>
                <div className="text-lg font-semibold">{data.ping}</div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <MemoryStick className="w-3 h-3" />
                  Memory
                </div>
                <div className="text-lg font-semibold">
                  {data.server.usedMemory}
                </div>
                <div className="text-xs text-muted-foreground">
                  / {data.server.maxMemory}
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Database className="w-3 h-3" />
                  Total Keys
                </div>
                <div className="text-lg font-semibold">
                  {data.summary.totalKeys}
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Zap className="w-3 h-3" />
                  Hit Rate
                </div>
                <div
                  className={`text-lg font-semibold ${
                    hitRate === null
                      ? "text-muted-foreground"
                      : hitRate >= 70
                      ? "text-green-600"
                      : hitRate >= 40
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {hitRate !== null ? `${hitRate}%` : "—"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {hits} hits / {misses} misses
                </div>
              </div>
            </div>

            {/* ── Category Summary ─────────────────────────────────────────── */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.summary.categories).map(([cat, count]) => {
                const config = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.other;
                return (
                  <span
                    key={cat}
                    className={`text-xs px-2 py-1 rounded-full border font-medium ${config.color}`}
                  >
                    {config.label}: {count}
                  </span>
                );
              })}
            </div>

            {/* ── Keys by Category ─────────────────────────────────────────── */}
            {data.keys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No keys in Redis yet. Try creating a project or sending a message.
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(keysByCategory).map(([cat, keys]) => {
                  const config = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.other;
                  const isOpen = expandedCategories[cat] !== false; // default open

                  return (
                    <div key={cat} className="border rounded-lg overflow-hidden">
                      {/* Category header */}
                      <button
                        onClick={() => toggleCategory(cat)}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                      >
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span
                          className={`text-xs px-2 py-0.5 rounded border font-medium ${config.color}`}
                        >
                          {config.label}
                        </span>
                        <span className="text-xs text-muted-foreground flex-1">
                          {config.description}
                        </span>
                        <span className="text-xs font-medium">{keys.length} keys</span>
                      </button>

                      {/* Keys list */}
                      {isOpen && (
                        <div className="p-2 space-y-1.5">
                          {keys.map((entry) => (
                            <KeyRow key={entry.key} entry={entry} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Server Info ──────────────────────────────────────────────── */}
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors py-1">
                Server info (Redis {data.server.version})
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground pl-2">
                <span>Mode: {data.server.mode}</span>
                <span>Uptime: {data.server.uptime}</span>
                <span>Clients: {data.server.connectedClients}</span>
                <span>Commands: {data.server.totalCommandsProcessed}</span>
              </div>
            </details>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
