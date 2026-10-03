import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173/priorfamilypickem/",
    trace: "on",
    screenshot: "on",
    video: "on"
  },
  webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173/priorfamilypickem/",
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_SUPABASE_URL: "https://priorfamilypickem.test",
      VITE_SUPABASE_ANON_KEY: "test-anon-key"
    }
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
