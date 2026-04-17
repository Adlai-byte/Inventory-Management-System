import { NextRequest, NextResponse } from "next/server";

/**
 * Allowed origins for CORS. In LAN mode, all local network IPs are allowed.
 * Add specific domains here for production use.
 */
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

/**
 * Check if the origin is allowed for CORS.
 * In development/LAN mode, allow all local network origins.
 */
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow local network origins in development
  if (process.env.NODE_ENV !== "production") {
    if (
      origin.startsWith("http://192.168.") ||
      origin.startsWith("http://10.") ||
      origin.startsWith("http://172.")
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Apply CORS headers to a response.
 * Usage: return withCors(request, NextResponse.json({ ... }));
 */
export function withCors(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get("origin");

  if (isAllowedOrigin(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin ?? "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Max-Age", "86400");
  }

  return response;
}

/**
 * Handle CORS preflight requests.
 * Usage in route.ts: export { handleCorsPreflight as OPTIONS }
 */
export function handleCorsPreflight(request: NextRequest): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  return withCors(request, response);
}
