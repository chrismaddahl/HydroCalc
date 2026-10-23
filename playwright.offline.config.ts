import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/offline",
  fullyParallel: true,
  use: {
    trace: "retain-on-failure",
    offline: true,
    launchOptions: process.env.HYDROCALC_CHROMIUM
      ? { executablePath: process.env.HYDROCALC_CHROMIUM }
      : {},
  },
  projects: [
    { name: "offline-chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
