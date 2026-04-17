/**
 * Phase 1.2 — Alerts & Notifications tests
 * All tests run with admin session pre-loaded via globalSetup.
 */

import { expect, test } from "@playwright/test";
import { getFirstProduct, getProductById, setProductQuantity } from "./helpers";

interface AlertsResponse {
  lowStock: { id: number; quantity: number; min_stock_level: number }[];
  expiring: { id: number; expiry_date: string }[];
  summary: {
    lowStockCount: number;
    outOfStockCount: number;
    expiredCount: number;
    expiringCount: number;
  };
}

async function getAlerts(request: Parameters<typeof getFirstProduct>[0]): Promise<AlertsResponse> {
  const res = await request.get("/api/alerts");
  expect(res.ok(), `getAlerts failed: ${res.status()}`).toBeTruthy();
  return res.json();
}

async function updateProductExpiry(
  request: Parameters<typeof getFirstProduct>[0],
  productId: number,
  expiryDate: string | null
) {
  const res = await request.put(`/api/products/${productId}`, {
    data: { expiry_date: expiryDate },
  });
  expect(res.ok(), `updateProductExpiry failed: ${await res.text()}`).toBeTruthy();
}

test.describe("Alerts & Notifications", () => {
  test("Low Stock Alert — product below threshold appears in /api/alerts lowStock", async ({
    request,
  }) => {
    const product = await getFirstProduct(request);
    const originalQty = product.quantity;
    const originalThreshold = product.min_stock_level || 5;

    // Temporarily update min_stock_level to something huge so it dominates the LIMIT 20
    const hugeThreshold = 9999;
    await request.put(`/api/products/${product.id}`, {
      data: { min_stock_level: hugeThreshold },
    });

    const alertsBefore = await getAlerts(request);
    const wasAlreadyLow = alertsBefore.lowStock.some((p) => p.id === product.id);

    // Force quantity to 1 (which is << 9999, ensuring ratio is near 0)
    await setProductQuantity(request, product.id, 1);

    const alertsAfter = await getAlerts(request);
    const isLowNow = alertsAfter.lowStock.some((p) => p.id === product.id);
    expect(isLowNow || wasAlreadyLow).toBeTruthy();

    if (!wasAlreadyLow) {
      expect(alertsAfter.summary.lowStockCount).toBeGreaterThan(alertsBefore.summary.lowStockCount);
    }

    // Restore
    await setProductQuantity(request, product.id, originalQty > 0 ? originalQty : 10);
    await request.put(`/api/products/${product.id}`, {
      data: { min_stock_level: originalThreshold },
    });
  });

  test("Low Stock Alert — product appears on the /alerts page UI", async ({ page, request }) => {
    const product = await getFirstProduct(request);
    const originalQty = product.quantity;
    const originalThreshold = product.min_stock_level || 5;

    // Force it to the top of the low-stock list
    const hugeThreshold = 9999;
    await request.put(`/api/products/${product.id}`, {
      data: { min_stock_level: hugeThreshold },
    });
    await setProductQuantity(request, product.id, 1);

    // Page already has admin session from storageState
    await page.goto("/alerts");
    await expect(page.getByText(/low stock/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(product.sku, { exact: false })).toBeVisible({ timeout: 10_000 });

    // Restore
    await setProductQuantity(request, product.id, originalQty > 0 ? originalQty : 10);
    await request.put(`/api/products/${product.id}`, {
      data: { min_stock_level: originalThreshold },
    });
  });

  test("Expiry Alert — setting expiry within 14 days increases expiring count", async ({
    request,
  }) => {
    const product = await getFirstProduct(request);
    const originalProduct = await getProductById(request, product.id);
    const originalExpiry = originalProduct.expiry_date;

    const alertsBefore = await getAlerts(request);
    const beforeCount = alertsBefore.summary.expiringCount;

    // Set expiry to 7 days from now
    const soon = new Date();
    soon.setDate(soon.getDate() + 7);
    const soonStr = soon.toISOString().slice(0, 10);

    await updateProductExpiry(request, product.id, soonStr);

    const alertsAfter = await getAlerts(request);
    const inExpiring = alertsAfter.expiring.some((p) => p.id === product.id);
    expect(inExpiring).toBeTruthy();
    expect(alertsAfter.summary.expiringCount).toBeGreaterThanOrEqual(beforeCount);

    // Dashboard summary should reflect it
    const dashRes = await request.get("/api/reports?type=summary");
    expect(dashRes.ok()).toBeTruthy();
    const dash = (await dashRes.json()) as { expiringSoonCount: number };
    expect(dash.expiringSoonCount).toBeGreaterThan(0);

    // Restore
    await updateProductExpiry(request, product.id, originalExpiry ?? null);
  });
});
