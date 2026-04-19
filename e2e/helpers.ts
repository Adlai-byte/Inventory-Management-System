import { type Page, type APIRequestContext, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------
export const ADMIN = { username: "admin", password: "admin123" };

// ---------------------------------------------------------------------------
// Login helpers
// ---------------------------------------------------------------------------
/**
 * Browser login: fills in the login form and waits for the dashboard redirect.
 * Use when you need to log in as a SPECIFIC user (e.g., staff, manager) in a
 * page context — overriding whatever storageState was loaded from global setup.
 */
export async function login(page: Page, username = ADMIN.username, password = ADMIN.password) {
  // Clear existing session
  await page.context().clearCookies();
  
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  
  // Wait for the Dashboard to appear and hydration to complete
  try {
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 15_000 });
  } catch (error) {
    const currentUrl = page.url();
    const pageText = await page.evaluate(() => document.body.innerText);
    throw new Error(`Login failed to navigate to dashboard. Current URL: ${currentUrl}\nPage Text: ${pageText.substring(0, 500)}`);
  }
}

/**
 * API login: authenticates the Playwright request context.
 * Only needed when creating a request context that doesn't inherit
 * the admin storageState (e.g., tests that need staff/manager API access).
 */
export async function apiLogin(
  request: APIRequestContext,
  username = ADMIN.username,
  password = ADMIN.password
) {
  const res = await request.post("/api/auth/login", {
    data: { username, password },
  });
  expect(res.ok(), `Login failed for ${username}: ${await res.text()}`).toBeTruthy();
}

// ---------------------------------------------------------------------------
// Temporary test-user lifecycle
// ---------------------------------------------------------------------------
export interface TestUser {
  id: number;
  username: string;
  password: string;
  role: "staff" | "manager";
}

let _userSeq = Date.now();

/**
 * Creates a temporary test user via the admin API.
 * The calling context must already be authenticated as admin.
 */
export async function createTestUser(
  request: APIRequestContext,
  role: "staff" | "manager"
): Promise<TestUser> {
  const username = `test_${role}_${_userSeq++}`;
  const password = "TestPass123!";

  const res = await request.post("/api/users", {
    data: {
      username,
      password,
      full_name: `Test ${role}`,
      email: `${username}@test.local`,
      role,
    },
  });

  expect(res.ok(), `createTestUser failed: ${await res.text()}`).toBeTruthy();
  const body = await res.json();
  return { id: body.data.id, username, password, role };
}

export async function deleteTestUser(request: APIRequestContext, userId: number) {
  // Best-effort cleanup — ignore errors if user already gone
  await request.delete(`/api/users/${userId}`).catch(() => {});
}

// ---------------------------------------------------------------------------
// Product helpers
// ---------------------------------------------------------------------------
export interface ProductRow {
  id: number;
  sku: string;
  quantity: number;
  cost_price: number;
  min_stock_level: number;
  expiry_date: string | null;
}

export async function getFirstProduct(request: APIRequestContext): Promise<ProductRow> {
  const res = await request.get("/api/products?limit=1&status=active");
  expect(res.ok(), `getFirstProduct failed: ${res.status()}`).toBeTruthy();
  const json = (await res.json()) as { data: ProductRow[] };
  expect(json.data.length).toBeGreaterThan(0);
  return json.data[0];
}

export async function getProductById(request: APIRequestContext, id: number): Promise<ProductRow> {
  const res = await request.get(`/api/products/${id}`);
  expect(res.ok(), `getProductById(${id}) failed: ${res.status()}`).toBeTruthy();
  const json = (await res.json()) as { data: ProductRow };
  return json.data;
}

export async function getProductBySku(request: APIRequestContext, sku: string): Promise<ProductRow> {
  const res = await request.get(`/api/products?q=${encodeURIComponent(sku)}&limit=1`);
  expect(res.ok(), `getProductBySku(${sku}) failed: ${res.status()}`).toBeTruthy();
  const json = (await res.json()) as { data: ProductRow[] };
  expect(json.data.length, `No product found with SKU ${sku}`).toBeGreaterThan(0);
  return json.data[0];
}

/** Set a product's quantity via an adjustment movement. Returns the previous quantity. */
export async function setProductQuantity(
  request: APIRequestContext,
  productId: number,
  targetQty: number
): Promise<number> {
  const product = await getProductById(request, productId);
  const prev = product.quantity;
  if (prev === targetQty) return prev;

  const res = await request.post("/api/stock-movements", {
    data: {
      type: "adjustment",
      notes: "Playwright test adjustment",
      items: [{ product_id: productId, quantity: targetQty }],
    },
  });
  expect(res.ok(), `setProductQuantity failed: ${await res.text()}`).toBeTruthy();
  return prev;
}

// ---------------------------------------------------------------------------
// Supplier helpers
// ---------------------------------------------------------------------------
export async function getFirstSupplier(request: APIRequestContext): Promise<{ id: number }> {
  const res = await request.get("/api/suppliers?limit=1");
  expect(res.ok(), `getFirstSupplier failed: ${res.status()}`).toBeTruthy();
  const json = (await res.json()) as { data: { id: number }[] };
  expect(json.data.length, "No suppliers found — add at least one supplier").toBeGreaterThan(0);
  return json.data[0];
}
