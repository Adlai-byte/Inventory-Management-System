// scripts/scanner-e2e-test.ts

import { test, expect } from "@playwright/test";

// Adjust these credentials to match an existing admin user in your system
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

// A handful of SKUs that exist in the sample DB. Adjust if needed.
const SAMPLE_SKUS = ["BEV-001", "SNK-001", "HSH-001", "TEST-001"];

// Movement types defined in the UI (including the pseudo‑type "stock_take")
const MOVEMENT_TYPES = [
  "restock",
  "transfer_out",
  "damage",
  "expired",
  "loss",
  "adjustment",
  "stock_take",
] as const;

// Helper to perform ten transactions for a given movement type
async function performTransactions(page: any, movement: typeof MOVEMENT_TYPES[number]) {
  // Select movement type
  await page.selectOption("select[data-testid='movement-select']", movement);
  // For stock_take we don't need a reason, otherwise we will provide one.
  const reasonNeeded = movement !== "transfer_out" && movement !== "stock_take" && movement !== "restock";

  for (let i = 0; i < 10; i++) {
    const sku = SAMPLE_SKUS[i % SAMPLE_SKUS.length];
    // Input SKU in the scanner field (keyboard mode)
    await page.fill("input[data-testid='scanner-input']", sku);
    await page.keyboard.press("Enter");
    // Ensure the product is added to the batch
    await expect(page.locator(`text=${sku}`)).toBeVisible();
    // If a reason is required, fill it now
    if (reasonNeeded) {
      await page.fill("input[data-testid='reason-input']", `${movement} reason ${i + 1}`);
    }
    // Wait a short moment before next scan
    await page.waitForTimeout(200);
  }

  // Click the record button
  await page.click("button[data-testid='record-button']");
  // Wait for success toast
  await expect(page.locator("text=Movement Recorded")).toBeVisible({ timeout: 5000 });
  // Reset batch for next movement type
  await page.click("button[data-testid='clear-batch']");
}

test.describe("Scanner stress test", () => {
  test("execute 10 transactions for each movement type and verify reports", async ({ page }) => {
    // --- Login ---
    await page.goto("http://localhost:3010/login");
    await page.fill("input[name='email']", ADMIN_EMAIL);
    await page.fill("input[name='password']", ADMIN_PASSWORD);
    await page.click("button[type='submit']");
    // Ensure login succeeded by checking dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // --- Navigate to Scanner ---
    await page.goto("http://localhost:3010/scanner");

    // Perform the series of transactions
    for (const movement of MOVEMENT_TYPES) {
      await performTransactions(page, movement);
    }

    // --- Verify Reports Page ---
    await page.goto("http://localhost:3010/reports");
    // Wait for reports to load
    await page.waitForLoadState("networkidle");
    // Capture a screenshot for manual verification
    await page.screenshot({ path: "reports-after-scanner-test.png", fullPage: true });
  });
});
