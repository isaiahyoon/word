import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.pw.spec.mjs",
  use: {
    baseURL: "http://127.0.0.1:4174",
    browserName: "chromium",
    headless: true,
  },
  webServer: {
    command: "PORT=4174 node tools/dev-server.mjs",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
  },
});