import type { NextRequest } from "next/server";

interface RateLimitOptions {
  limit: number;
  window: number;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const authStore = new Map<string, RateLimitRecord>();
const apiStore = new Map<string, RateLimitRecord>();
const MAX_STORE_SIZE = 10000;
const CLEANUP_INTERVAL_MS = 60000;

function cleanupStore(store: Map<string, RateLimitRecord>): void {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now > record.resetTime) {
      store.delete(key);
    }
  }
}

function aggressiveCleanup(store: Map<string, RateLimitRecord>): void {
  if (store.size <= MAX_STORE_SIZE) return;
  // Remove oldest entries first
  const sorted = Array.from(store.entries()).sort(
    (a, b) => a[1].resetTime - b[1].resetTime
  );
  const toRemove = Math.ceil(store.size * 0.3);
  for (let i = 0; i < toRemove; i++) {
    store.delete(sorted[i][0]);
  }
}

// Periodic cleanup interval
const cleanupInterval = setInterval(() => {
  cleanupStore(authStore);
  cleanupStore(apiStore);
  aggressiveCleanup(authStore);
  aggressiveCleanup(apiStore);
}, CLEANUP_INTERVAL_MS);

// Prevent interval from blocking Node.js shutdown
if (typeof cleanupInterval.unref === "function") {
  cleanupInterval.unref();
}

export function rateLimit(request: NextRequest, options: RateLimitOptions): { success: boolean; remaining: number } {
  const now = Date.now();
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || realIp || "unknown";

  // Bypass rate limiting during E2E testing or local development
  if (
    request.headers.get("x-e2e-test") === "true" ||
    process.env.NODE_ENV === "development"
  ) {
    return { success: true, remaining: options.limit };
  }

  if (ip === "unknown" || !ip) {
    return { success: true, remaining: options.limit };
  }

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.includes("/api/auth");
  const store = isAuthRoute ? authStore : apiStore;

  // Aggressive cleanup if store is too large
  if (store.size > MAX_STORE_SIZE * 0.8) {
    aggressiveCleanup(store);
  }

  const key = `${ip}:${isAuthRoute ? "auth" : path}`;
  const record = store.get(key);

  if (!record || now > record.resetTime) {
    store.set(key, { count: 1, resetTime: now + options.window * 1000 });
    return { success: true, remaining: options.limit - 1 };
  }

  if (record.count >= options.limit) {
    return { success: false, remaining: 0 };
  }

  record.count++;
  return { success: true, remaining: options.limit - record.count };
}