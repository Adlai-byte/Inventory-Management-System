/**
 * Phase 2.1 — Role-Based Access Control (RBAC) tests
 *
 * - beforeAll runs with admin session (from globalSetup storageState) to create test users
 * - RBAC sidebar/API tests log in as staff/manager via page login (overrides storageState)
 * - Test users are deleted in afterAll
 */

import { expect, test } from "@playwright/test";
import {
  login,
  createTestUser,
  deleteTestUser,
  apiLogin,
  type TestUser,
} from "./helpers";

const MANAGER_ONLY_ITEMS = ["Deliveries", "Stock Takes", "Categories", "Suppliers", "Reports", "Activity Log"];
const ADMIN_ONLY_ITEMS   = ["Users", "Settings"];

// ---------------------------------------------------------------------------
// Staff Role
// ---------------------------------------------------------------------------
test.describe("RBAC — Staff role", () => {
  let staffUser: TestUser;

  test.beforeAll(async ({ request }) => {
    // request context already has admin session from storageState
    staffUser = await createTestUser(request, "staff");
  });

  test.afterAll(async ({ request }) => {
    await deleteTestUser(request, staffUser.id);
  });

  test("Staff sidebar hides managerOnly and adminOnly nav items", async ({ page }) => {
    // Log in as staff (login() clears cookies first, then re-auths as staff)
    await login(page, staffUser.username, staffUser.password);
    // Wait for profile to load (user's name appears in header)
    await expect(page.getByText("Test staff")).toBeVisible({ timeout: 10_000 });

    for (const label of MANAGER_ONLY_ITEMS) {
      await expect(
        page.locator("nav").getByRole("link", { name: label }),
        `"${label}" should be hidden for staff`
      ).not.toBeVisible();
    }
    for (const label of ADMIN_ONLY_ITEMS) {
      await expect(
        page.locator("nav").getByRole("link", { name: label }),
        `"${label}" should be hidden for staff`
      ).not.toBeVisible();
    }
    // Items that SHOULD be visible
    await expect(page.locator("nav").getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(page.locator("nav").getByRole("link", { name: "Products" })).toBeVisible();
    await expect(page.locator("nav").getByRole("link", { name: "Scanner" })).toBeVisible();
  });

  test("Staff — /api/reports returns 403", async ({ page }) => {
    await login(page, staffUser.username, staffUser.password);
    const res = await page.request.get("/api/reports?type=summary");
    expect(res.status()).toBe(403);
  });

  test("Staff — /api/users returns 403", async ({ page }) => {
    await login(page, staffUser.username, staffUser.password);
    const res = await page.request.get("/api/users");
    expect(res.status()).toBe(403);
  });

  test("Staff — /api/purchase-orders returns 403", async ({ page }) => {
    await login(page, staffUser.username, staffUser.password);
    const res = await page.request.get("/api/purchase-orders");
    expect(res.status()).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Manager Role
// ---------------------------------------------------------------------------
test.describe("RBAC — Manager role", () => {
  let managerUser: TestUser;

  test.beforeAll(async ({ request }) => {
    managerUser = await createTestUser(request, "manager");
  });

  test.afterAll(async ({ request }) => {
    await deleteTestUser(request, managerUser.id);
  });

  test("Manager sidebar shows managerOnly but hides adminOnly items", async ({ page }) => {
    await login(page, managerUser.username, managerUser.password);
    // Wait for profile to load
    await expect(page.getByText("Test manager")).toBeVisible({ timeout: 10_000 });

    for (const label of MANAGER_ONLY_ITEMS) {
      await expect(
        page.locator("nav").getByRole("link", { name: label }),
        `"${label}" should be visible for manager`
      ).toBeVisible();
    }
    for (const label of ADMIN_ONLY_ITEMS) {
      await expect(
        page.locator("nav").getByRole("link", { name: label }),
        `"${label}" should be hidden for manager`
      ).not.toBeVisible();
    }
  });

  test("Manager — /api/reports returns 200", async ({ page }) => {
    await login(page, managerUser.username, managerUser.password);
    const res = await page.request.get("/api/reports?type=summary");
    expect(res.ok()).toBeTruthy();
  });

  test("Manager — /api/users returns 403 (admin-only)", async ({ page }) => {
    await login(page, managerUser.username, managerUser.password);
    const res = await page.request.get("/api/users");
    expect(res.status()).toBe(403);
  });
});
