import { NextResponse, type NextRequest } from "next/server";
import { parseSessionToken } from "@/lib/session-token";

const SESSION_COOKIE = "inv_session";

// API routes that don't require authentication
const publicApiRoutes = ["/api/auth/login", "/api/auth/register", "/api/health"];

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await parseSessionToken(token) : null;
  const isLoggedIn = !!session;

  const { pathname } = request.nextUrl;

  // 1. Allow public API routes
  if (publicApiRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"))) {
    return NextResponse.next();
  }

  // 2. Block /register → redirect to /login (no redirect query param)
  if (pathname === "/register" || pathname.startsWith("/register/")) {
    if (isLoggedIn) {
      // Authenticated user on auth page → redirect to /
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 3. Handle /login
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    if (isLoggedIn) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 4. Check session for protected routes
  if (!isLoggedIn) {
    const isApi = pathname.startsWith("/api/");
    if (isApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Page request → redirect to /login with return URL
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Role-based access for admin-only routes
  if (
    pathname.startsWith("/api/users") ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/api/settings") ||
    pathname.startsWith("/settings")
  ) {
    if (session?.role !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // 6. Role-based access for manager+ routes
  if (
    pathname.startsWith("/api/categories") ||
    pathname.startsWith("/categories") ||
    pathname.startsWith("/api/suppliers") ||
    pathname.startsWith("/suppliers") ||
    pathname.startsWith("/api/reports") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/api/activity-log") ||
    pathname.startsWith("/activity-log") ||
    pathname.startsWith("/api/purchase-orders") ||
    pathname.startsWith("/purchase-orders") ||
    pathname.startsWith("/api/stock-takes") ||
    pathname.startsWith("/stock-takes") ||
    pathname.startsWith("/warehouses") ||
    pathname.startsWith("/api/warehouses")
  ) {
    if (session?.role !== "admin" && session?.role !== "manager") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
