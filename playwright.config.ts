import { defineConfig, devices } from "@playwright/test";
import { E2E_BASE_URL } from "./e2e/env";

const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  outputDir: "./test-results",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: 2,
  // next dev compiles each page on its first visit, which can take half a minute.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: CI
    ? [["github"], ["list"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: E2E_BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
    // No hostname but localhost resolves, so nothing the routes can't see (preconnects, sockets) leaves the machine either.
    launchOptions: { args: ["--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE localhost"] },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: {
    // Bun would load .env files into the wrapper; next dev only fills names the wrapper left unset.
    command: "bun --no-env-file e2e/server.ts",
    url: `${E2E_BASE_URL}/api/health`,
    reuseExistingServer: !CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
  },
});
