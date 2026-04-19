import { defineConfig, devices } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "e2e/.auth/admin.json");

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,        // serial — shares one session, avoids rate-limit issues
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3010",
    // All test contexts start pre-authenticated as admin
    storageState: authFile,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    extraHTTPHeaders: {
      "x-e2e-test": "true",
    },
  },
  webServer: {
    command: "npm.cmd run dev",
    url: "http://127.0.0.1:3010",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
