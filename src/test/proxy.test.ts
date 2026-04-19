import { describe, it, expect, beforeAll, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { createSessionToken } from "@/lib/session-token";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_SECRET = "test-secret-key-that-is-at-least-32-characters-long!!";

function makeRequest(
  path: string,
  options?: { sessionToken?: string }
): NextRequest {
  const url = new URL(path, "http://localhost:3010");
  const headers = new Headers();
  if (options?.sessionToken) {
    headers.set("Cookie", `inv_session=${options.sessionToken}`);
  }
  return new NextRequest(url, { headers });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Auth Proxy (Middleware)", () => {
  let adminToken: string;
  let managerToken: string;
  let staffToken: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = VALID_SECRET;

    adminToken = await createSessionToken({
      id: 1,
      username: "admin",
      full_name: "Admin",
      role: "admin",
    });

    managerToken = await createSessionToken({
      id: 2,
      username: "manager",
      full_name: "Manager",
      role: "manager",
    });

    staffToken = await createSessionToken({
      id: 3,
      username: "staff",
      full_name: "Staff",
      role: "staff",
    });
  });

  // ── Public Routes ──────────────────────────────────────────────────
  describe("Public routes", () => {
    it("should allow /api/health without auth", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/api/health");
      const res = await proxy(req);
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(401);
    });

    it("should allow /api/auth/login without auth", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/api/auth/login");
      const res = await proxy(req);
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(401);
    });

    it("should allow /login page without auth", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/login");
      const res = await proxy(req);
      expect(res.status).not.toBe(307);
    });

    it("should allow /register page without auth", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/register");
      // /register is blocked (redirects to /login) but should not require auth
      const res = await proxy(req);
      // It redirects to /login, not to /login?redirect=...
      if (res.status === 307) {
        expect(res.headers.get("location")).toContain("/login");
        expect(res.headers.get("location")).not.toContain("redirect=");
      }
    });
  });

  // ── Authenticated user on /login → redirect to / ──────────────────
  describe("Authenticated user on auth pages", () => {
    it("should redirect /login to / when authenticated", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/login", { sessionToken: adminToken });
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/");
    });
  });

  // ── Unauthenticated access → redirect to /login ──────────────────
  describe("Unauthenticated page access", () => {
    it("should redirect /products to /login", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/products");
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
      expect(res.headers.get("location")).toContain(
        "%2Fproducts"
      );
    });

    it("should redirect / to /login", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/");
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
    });

    it("should redirect /scanner to /login", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/scanner");
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
    });
  });

  // ── Unauthenticated API access → 401 ──────────────────────────────
  describe("Unauthenticated API access", () => {
    it("should return 401 for /api/products", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/api/products");
      const res = await proxy(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("should return 401 for /api/dashboard", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/api/dashboard");
      const res = await proxy(req);
      expect(res.status).toBe(401);
    });

    it("should return 401 for /api/stock-movements", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/api/stock-movements");
      const res = await proxy(req);
      expect(res.status).toBe(401);
    });
  });

  // ── Authenticated page access → pass through ──────────────────────
  describe("Authenticated page access", () => {
    it("should allow staff on /products", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/products", { sessionToken: staffToken });
      const res = await proxy(req);
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(401);
    });

    it("should allow staff on /scanner", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/scanner", { sessionToken: staffToken });
      const res = await proxy(req);
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(401);
    });

    it("should allow staff on /stock-movements", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/stock-movements", { sessionToken: staffToken });
      const res = await proxy(req);
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(401);
    });

    it("should allow staff on /alerts", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/alerts", { sessionToken: staffToken });
      const res = await proxy(req);
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(401);
    });
  });

  // ── Authenticated API access → pass through ───────────────────────
  describe("Authenticated API access", () => {
    it("should allow staff on /api/products", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/api/products", { sessionToken: staffToken });
      const res = await proxy(req);
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it("should allow staff on /api/dashboard", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/api/dashboard", { sessionToken: staffToken });
      const res = await proxy(req);
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(401);
    });
  });

  // ── Admin-only routes ──────────────────────────────────────────────
  describe("Admin-only routes", () => {
    it("should block staff from /users page → redirect to /", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/users", { sessionToken: staffToken });
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/");
    });

    it("should block staff from /api/users → 403", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/api/users", { sessionToken: staffToken });
      const res = await proxy(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Forbidden");
    });

    it("should block manager from /users page → redirect to /", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/users", { sessionToken: managerToken });
      const res = await proxy(req);
      expect(res.status).toBe(307);
    });

    it("should block manager from /api/users → 403", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/api/users", { sessionToken: managerToken });
      const res = await proxy(req);
      expect(res.status).toBe(403);
    });

    it("should allow admin on /users", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/users", { sessionToken: adminToken });
      const res = await proxy(req);
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(403);
    });

    it("should allow admin on /api/users", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/api/users", { sessionToken: adminToken });
      const res = await proxy(req);
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(403);
    });

    it("should block staff from /settings → redirect to /", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/settings", { sessionToken: staffToken });
      const res = await proxy(req);
      expect(res.status).toBe(307);
    });

    it("should block staff from /api/settings → 403", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/api/settings", { sessionToken: staffToken });
      const res = await proxy(req);
      expect(res.status).toBe(403);
    });
  });

  // ── Manager+ routes ────────────────────────────────────────────────
  describe("Manager+ routes", () => {
    it("should block staff from /reports → redirect to /", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/reports", { sessionToken: staffToken });
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/");
    });

    it("should block staff from /api/reports → 403", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/api/reports", { sessionToken: staffToken });
      const res = await proxy(req);
      expect(res.status).toBe(403);
    });

    it("should allow manager on /reports", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/reports", { sessionToken: managerToken });
      const res = await proxy(req);
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(403);
    });

    it("should allow manager on /api/reports", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/api/reports", { sessionToken: managerToken });
      const res = await proxy(req);
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(403);
    });

    it("should block staff from /purchase-orders → redirect to /", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/purchase-orders", { sessionToken: staffToken });
      const res = await proxy(req);
      expect(res.status).toBe(307);
    });

    it("should block staff from /api/purchase-orders → 403", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/api/purchase-orders", { sessionToken: staffToken });
      const res = await proxy(req);
      expect(res.status).toBe(403);
    });

    it("should allow manager on /purchase-orders", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/purchase-orders", { sessionToken: managerToken });
      const res = await proxy(req);
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(403);
    });

    it("should block staff from /categories → redirect to /", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/categories", { sessionToken: staffToken });
      const res = await proxy(req);
      expect(res.status).toBe(307);
    });

    it("should block staff from /suppliers → redirect to /", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/suppliers", { sessionToken: staffToken });
      const res = await proxy(req);
      expect(res.status).toBe(307);
    });

    it("should block staff from /activity-log → redirect to /", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/activity-log", { sessionToken: staffToken });
      const res = await proxy(req);
      expect(res.status).toBe(307);
    });

    it("should block staff from /stock-takes → redirect to /", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/stock-takes", { sessionToken: staffToken });
      const res = await proxy(req);
      expect(res.status).toBe(307);
    });
  });

  // ── Tampered / invalid tokens ──────────────────────────────────────
  describe("Invalid tokens", () => {
    it("should reject tampered token on /products → redirect to /login", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/products", {
        sessionToken: adminToken + "tampered",
      });
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
    });

    it("should reject empty token on /api/products → 401", async () => {
      const { proxy } = await import("@/proxy");
      const req = makeRequest("/api/products", { sessionToken: "" });
      const res = await proxy(req);
      expect(res.status).toBe(401);
    });
  });
});
