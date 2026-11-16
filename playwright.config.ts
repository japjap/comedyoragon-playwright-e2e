import { defineConfig, devices } from "@playwright/test";
import "dotenv/config";

const isCI = !!process.env.CI;
const PRODUCTION_URL = "https://comedyoragon.com";

/** Local/CI projects run every spec except the production-only ones. */
const local = { testIgnore: /smoke\.spec\.ts/, grepInvert: /@prod-content/ };

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 60_000, // the local dev server compiles pages on first visit
  expect: { timeout: 10_000 },
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", ...local, use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", ...local, use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", ...local, use: { ...devices["Desktop Safari"] } },
    { name: "iPhone 13", ...local, use: { ...devices["iPhone 13"] } },
    { name: "Pixel 7", ...local, use: { ...devices["Pixel 7"] } },

    // Read-only production projects. Run only via npm run test:smoke / test:prod-content.
    {
      name: "prod-smoke",
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: PRODUCTION_URL },
    },
    {
      name: "prod-content",
      testIgnore: /smoke\.spec\.ts/,
      grep: /@prod-content/,
      use: { ...devices["Desktop Chrome"], baseURL: PRODUCTION_URL },
    },
  ],
});
