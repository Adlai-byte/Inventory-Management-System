import { test, expect } from "@playwright/test";
import { login, getFirstProduct, getProductBySku } from "./helpers";

test.describe("Offline Scanner & PWA Sync", () => {
  test("queued movements sync automatically when back online", async ({ page, context }) => {
    await login(page);

    const product = await getFirstProduct(page.request);
    const originalQty = product.quantity;

    await page.goto("/scanner");
    await expect(page.getByText("Online", { exact: true })).toBeVisible();
    
    // Wait for product cache to hydrate
    await expect(page.getByText(/products cached/i)).toBeVisible({ timeout: 15000 });

    // 1. Go Offline
    await context.setOffline(true);
    await expect(page.getByText("Offline Mode", { exact: true })).toBeVisible();

    // 2. Set movement type first (changing type clears the cart)
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Restock" }).click();

    // 3. Perform Scan while offline
    await page.getByRole("button", { name: "Manual" }).click();
    await page.getByPlaceholder("Type Barcode or SKU...").fill(product.sku);
    await page.getByRole("button", { name: "Search" }).click();
    
    // Wait for the item to appear in the batch
    await expect(page.getByText(product.name).first()).toBeVisible();

    await page.getByRole("button", { name: /Record Restock/i }).click();

    // 3. Verify it was queued
    await expect(page.getByText("Saved to offline queue")).toBeVisible();
    await expect(page.getByText("1 Pending Sync")).toBeVisible();

    // 4. Go Online
    await context.setOffline(false);
    
    // 5. Verify Auto-Sync
    await expect(page.getByText(/Successfully synced 1 offline record/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Online", { exact: true })).toBeVisible();

    // 6. Verify data reached the server
    const updated = await getProductBySku(page.request, product.sku);
    expect(updated.quantity).toBe(originalQty + 1);
  });
});
