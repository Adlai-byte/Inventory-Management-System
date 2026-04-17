/**
 * Playwright Global Setup
 *
 * Runs once before all tests. Logs in as admin via the API (not the browser form)
 * to avoid client-side navigation timing issues, saves the session cookie to
 * e2e/.auth/admin.json so every test context starts pre-authenticated.
 */
import { request as playwrightRequest, type FullConfig } from "@playwright/test";
import fs from "fs";
import path from "path";

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL ?? "http://127.0.0.1:3000";
  const authDir = path.join(__dirname, ".auth");

  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Use API login (not browser form) — much faster and avoids navigation races
  const context = await playwrightRequest.newContext({ baseURL });

  const res = await context.post("/api/auth/login", {
    data: { username: "admin", password: "admin123" },
  });

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`Global setup login failed (${res.status()}): ${body}`);
  }

  // Save cookies to disk so all test contexts load them via storageState
  await context.storageState({ path: path.join(authDir, "admin.json") });
  await context.dispose();

  console.log("✓ Global setup: admin session saved to e2e/.auth/admin.json");
}
