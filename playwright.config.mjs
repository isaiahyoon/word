import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.pw.spec.mjs",
  fullyParallel: true,
  expect: { timeout: 15_000 },
  workers: process.env.CI ? 2 : "50%",
  use: {
    baseURL: "http://127.0.0.1:4174",
    browserName: "chromium",
    headless: true,
  },
  webServer: {
    command: "PORT=4174 node tools/dev-server.mjs",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
  },
});