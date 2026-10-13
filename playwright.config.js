import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  use: { baseURL: "http://127.0.0.1:4173", headless: true, channel: process.env.CI ? undefined : "chromium" },
  webServer: { command: "npm run preview", url: "http://127.0.0.1:4173", reuseExistingServer: !process.env.CI },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
});
