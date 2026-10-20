import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

// Use the pre-installed Chromium when present (cloud sandbox); otherwise Playwright's default.
const localChromium = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const executablePath = existsSync(localChromium) ? localChromium : undefined;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: "npm run build && npx next start -p 3100",
    url: "http://localhost:3100",
    timeout: 240_000,
    reuseExistingServer: true,
    env: { GEMINI_API_KEY: "" },
  },
});
