/**
 * Phase 1.1 — Deliveries (Purchase Orders) lifecycle tests
 *
 * All tests run with the admin session pre-loaded via globalSetup/storageState.
 * No per-test apiLogin calls needed.
 */

import { expect, test } from "@playwright/test";
import {
  login,
  getFirstSupplier,
  getProductById,
  type ProductRow,
} from "./helpers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PoItemRow {
  id: number;
  product_id: number;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
}

interface MovementRow {
  product_id: number;
  type: string;
  quantity: number;
  unit_cost: number;
  reason: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function createPo(
  request: Parameters<typeof getFirstSupplier>[0],
  supplierId: number,
  items: { product_id: number; quantity: number; unit_cost: number }[]
): Promise<{ id: number; po_number: string }> {
  const res = await request.post("/api/purchase-orders", {
    data: { supplier_id: supplierId, items },
  });
  expect(res.ok(), `createPo failed: ${await res.text()}`).toBeTruthy();
  return res.json();
}

async function getPo(
  request: Parameters<typeof getFirstSupplier>[0],
  id: number
): Promise<{ status: string; items: PoItemRow[] }> {
  const res = await request.get(`/api/purchase-orders/${id}`);
  expect(res.ok()).toBeTruthy();
  const json = (await res.json()) as { data: { status: string; items: PoItemRow[] } };
  return json.data;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
test.describe("Purchase Orders lifecycle", () => {
  let supplierId: number;
  let products: ProductRow[];
  let poId: number;
  let poNumber: string;

  test.beforeAll(async ({ request }) => {
    // Already authenticated via globalSetup storageState
    const supplier = await getFirstSupplier(request);
    supplierId = supplier.id;

    const r = await request.get("/api/products?limit=3&status=active");
    expect(r.ok()).toBeTruthy();
    const json = (await r.json()) as { data: ProductRow[] };
    expect(json.data.length, "Need at least 1 active product").toBeGreaterThan(0);
    products = json.data;
  });

  // ── 1. PO Creation ─────────────────────────────────────────────────────────
  test("PO Creation — 3 line-items → status is pending", async ({ request }) => {
    const p1 = products[0];
    const p2 = products[Math.min(1, products.length - 1)];
    const p3 = products[Math.min(2, products.length - 1)];

    const { id, po_number } = await createPo(request, supplierId, [
      { product_id: p1.id, quantity: 10, unit_cost: p1.cost_price || 5 },
      { product_id: p2.id, quantity: 5,  unit_cost: p2.cost_price || 3 },
      { product_id: p3.id, quantity: 3,  unit_cost: p3.cost_price || 8 },
    ]);

    poId     = id;
    poNumber = po_number;

    const po = await getPo(request, id);
    expect(po.status).toBe("pending");
    expect(po.items.length).toBe(3);
    expect(po.items.every((i) => i.quantity_received === 0)).toBeTruthy();
  });

  // ── 2. Partial Receipt ─────────────────────────────────────────────────────
  test("Partial Receipt — receive first item only → status is partial", async ({ request }) => {
    const poBefore = await getPo(request, poId);
    const firstItem = poBefore.items[0];

    const productBefore = await getProductById(request, firstItem.product_id);
    const stockBefore = productBefore.quantity;

    const res = await request.put(`/api/purchase-orders/${poId}`, {
      data: {
        receive_items: [{ item_id: firstItem.id, quantity_to_receive: 1 }],
      },
    });
    expect(res.ok(), `Partial receive failed: ${await res.text()}`).toBeTruthy();

    const poAfter = await getPo(request, poId);
    expect(poAfter.status).toBe("partial");

    const updatedItem = poAfter.items.find((i) => i.id === firstItem.id)!;
    expect(updatedItem.quantity_received).toBe(firstItem.quantity_received + 1);

    const productAfter = await getProductById(request, firstItem.product_id);
    expect(productAfter.quantity).toBe(stockBefore + 1);
  });

  // ── 3. Full Receipt ────────────────────────────────────────────────────────
  test("Full Receipt — receive all remaining → status is received", async ({ request }) => {
    const poBefore = await getPo(request, poId);
    const receiveItems = poBefore.items
      .map((i) => ({
        item_id: i.id,
        quantity_to_receive: i.quantity_ordered - i.quantity_received,
      }))
      .filter((r) => r.quantity_to_receive > 0);

    expect(receiveItems.length).toBeGreaterThan(0);

    const res = await request.put(`/api/purchase-orders/${poId}`, {
      data: { receive_items: receiveItems },
    });
    expect(res.ok(), `Full receive failed: ${await res.text()}`).toBeTruthy();

    const poAfter = await getPo(request, poId);
    expect(poAfter.status).toBe("received");
    expect(poAfter.items.every((i) => i.quantity_received === i.quantity_ordered)).toBeTruthy();
  });

  // ── 4. Cost Sync ───────────────────────────────────────────────────────────
  test("Cost Sync — stock movement unit_cost matches PO line-item cost", async ({ request }) => {
    const po = await getPo(request, poId);
    const firstItem = po.items[0];

    const movRes = await request.get(
      `/api/stock-movements?search=${encodeURIComponent(poNumber)}&type=restock&limit=50`
    );
    expect(movRes.ok()).toBeTruthy();
    const movJson = (await movRes.json()) as { data: MovementRow[] };

    const movement = movJson.data.find(
      (m) => m.product_id === firstItem.product_id && m.type === "restock"
    );
    expect(movement, "Restock movement not found for PO product").toBeTruthy();
    expect(Number(movement!.unit_cost)).toBeCloseTo(Number(firstItem.unit_cost), 2);
  });

  // ── 5. UI — partial receipt dialog ────────────────────────────────────────
  test("UI — Receive Items dialog sets PO status to partial", async ({ page, request }) => {
    // Create a fresh PO via API
    const { id: newPoId } = await createPo(request, supplierId, [
      { product_id: products[0].id, quantity: 4, unit_cost: products[0].cost_price || 5 },
    ]);

    // Navigate to PO page (page context already has admin session)
    await page.goto("/purchase-orders");

    // Click "Receive Items" for our new PO
    const receiveBtn = page.locator(`#btn-receive-${newPoId}`);
    await expect(receiveBtn).toBeVisible({ timeout: 10_000 });
    await receiveBtn.click();

    await expect(page.getByRole("dialog")).toBeVisible();

    // Enter quantity = 2
    const qtyInput = page.locator(`[id^="receive-qty-"]`).first();
    await qtyInput.fill("2");

    await page.getByRole("button", { name: "Confirm Receipt" }).click();
    await expect(page.getByText(/Items received and stock updated/i)).toBeVisible({ timeout: 8_000 });

    // Row should now show "Partial" badge
    await page.waitForTimeout(500);
    const row = page.locator(`[data-order-id="${newPoId}"]`);
    await expect(row.getByText("Partial")).toBeVisible({ timeout: 8_000 });
  });
});
