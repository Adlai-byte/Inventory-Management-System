/**
 * Phase 3 — Data Integrity & Analytics tests
 * All tests run with admin session pre-loaded via globalSetup.
 */

import { expect, test } from "@playwright/test";
import { getFirstProduct, getProductById, setProductQuantity } from "./helpers";

interface ProductRow {
  id: number;
  quantity: number;
  cost_price: number;
}

interface ValuationReport {
  total: { total_cost_value: number };
}

interface OutboundTrends {
  summary: {
    total_transfers: number;
    total_items_dispatched: number;
  };
}

interface ActivityRow {
  entity_type: string;
  action: string;
  details: string;
  entity_id: number;
}

// ---------------------------------------------------------------------------
// 3.1 — Report Accuracy
// ---------------------------------------------------------------------------
test.describe("Report Accuracy", () => {
  test("Cost Value Audit — valuation report updates correctly when stock changes", async ({
    request,
  }) => {
    // 1. Get initial valuation
    const initialRes = await request.get("/api/reports?type=valuation");
    expect(initialRes.ok()).toBeTruthy();
    const initialJson = await initialRes.json();
    const initialCostValue = Number(initialJson.total.total_cost_value || 0);

    // 2. Pick a product to modify
    const product = await getFirstProduct(request);
    const originalQty = product.quantity;
    const costPrice = Number(product.cost_price || 0);
    const addedQuantity = 10;

    // 3. Update quantity
    await setProductQuantity(request, product.id, originalQty + addedQuantity);

    // 4. Get new valuation
    const newRes = await request.get("/api/reports?type=valuation");
    const newJson = await newRes.json();
    const newCostValue = Number(newJson.total.total_cost_value || 0);

    // 5. Verify difference
    const expectedDifference = addedQuantity * costPrice;
    expect(Math.abs(newCostValue - (initialCostValue + expectedDifference))).toBeLessThanOrEqual(0.01);

    // Restore
    await setProductQuantity(request, product.id, originalQty);
  });

  test("Dispatch Trend Sync — transfer_out is reflected in outbound_trends", async ({
    request,
  }) => {
    const product = await getFirstProduct(request);
    test.skip(product.quantity < 1, "Need a product with stock > 0");

    const today = new Date().toLocaleDateString("sv-SE");
    const trendsBefore = (await (
      await request.get(`/api/reports?type=outbound_trends&period=daily&date=${today}`)
    ).json()) as OutboundTrends;
    const dispatchedBefore = trendsBefore.summary.total_items_dispatched;

    const moveRes = await request.post("/api/stock-movements", {
      data: {
        type: "transfer_out",
        reason: "Playwright dispatch sync test",
        items: [{ product_id: product.id, quantity: 1 }],
      },
    });
    expect(moveRes.ok(), `transfer_out failed: ${await moveRes.text()}`).toBeTruthy();

    // Retry check for up to 3 times with 1s delay to account for DB commit lag
    let trendsAfter;
    let dispatchedAfter = dispatchedBefore;
    
    for (let i = 0; i < 3; i++) {
      trendsAfter = (await (
        await request.get(`/api/reports?type=outbound_trends&period=daily&date=${today}`)
      ).json()) as OutboundTrends;
      dispatchedAfter = trendsAfter.summary.total_items_dispatched;
      if (dispatchedAfter > dispatchedBefore) break;
      await new Promise(r => setTimeout(r, 1000));
    }

    expect(dispatchedAfter).toBeGreaterThan(dispatchedBefore);

    // Restore
    await setProductQuantity(request, product.id, product.quantity);
  });
});

// ---------------------------------------------------------------------------
// 3.2 — Movement History
// ---------------------------------------------------------------------------
test.describe("Movement History", () => {
  test("Negative Stock Prevention — transfer_out > stock returns 400", async ({ request }) => {
    const product = await getFirstProduct(request);
    const overQty = product.quantity + 999;

    const res = await request.post("/api/stock-movements", {
      data: {
        type: "transfer_out",
        reason: "Playwright negative-stock test",
        items: [{ product_id: product.id, quantity: overQty }],
      },
    });

    expect(res.status()).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error.toLowerCase()).toMatch(/insufficient/i);
  });

  test("Stock Take Log — completed stock take with variance appears in activity log", async ({
    request,
  }) => {
    const product = await getFirstProduct(request);
    const systemQty = product.quantity;
    const countedQty = Math.max(0, systemQty - 1);

    const createRes = await request.post("/api/stock-takes", {
      data: {
        name: `Playwright Test Stock Take ${Date.now()}`,
        items: [{ product_id: product.id, counted_quantity: countedQty }],
      },
    });
    expect(createRes.ok(), `stock-take create failed: ${await createRes.text()}`).toBeTruthy();
    const { id: stockTakeId } = (await createRes.json()) as { id: number };

    const completeRes = await request.put(`/api/stock-takes/${stockTakeId}`, {
      data: { action: "complete" },
    });
    expect(completeRes.ok(), `stock-take complete failed: ${await completeRes.text()}`).toBeTruthy();

    const logRes = await request.get(`/api/activity-log?entity=stock_take&limit=10`);
    expect(logRes.ok()).toBeTruthy();
    const logJson = (await logRes.json()) as { data: ActivityRow[] };

    const entry = logJson.data.find(
      (a) => a.entity_id === stockTakeId || a.details.includes(String(stockTakeId))
    );
    expect(entry, "Activity log entry for stock take not found").toBeTruthy();

    // Restore
    await setProductQuantity(request, product.id, systemQty);
  });

  test("Stock Take Log — variance adjustment is reflected in stock movements", async ({
    request,
  }) => {
    const product = await getFirstProduct(request);
    const systemQty = product.quantity;
    const countedQty = Math.max(0, systemQty - 2);

    const createRes = await request.post("/api/stock-takes", {
      data: {
        name: `Playwright Variance Test ${Date.now()}`,
        items: [{ product_id: product.id, counted_quantity: countedQty }],
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const { id: stockTakeId } = (await createRes.json()) as { id: number };

    await request.put(`/api/stock-takes/${stockTakeId}`, { data: { action: "complete" } });

    const movRes = await request.get(`/api/stock-movements?type=adjustment&limit=10`);
    expect(movRes.ok()).toBeTruthy();
    const movJson = (await movRes.json()) as {
      data: { product_id: number; type: string; new_quantity: number }[];
    };

    const adjMovement = movJson.data.find((m) => m.product_id === product.id);
    expect(adjMovement, "Adjustment movement not found").toBeTruthy();

    // Restore
    await setProductQuantity(request, product.id, systemQty);
  });
});
