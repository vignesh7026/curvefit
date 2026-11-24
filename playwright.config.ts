import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const WEB = 3100;
const API = 4100;
const MONGO = 27118;
const dataDir = resolve(__dirname, "apps/api/.data-e2e");
const uploadDir = resolve(__dirname, "apps/api/.uploads-e2e");

const apiEnv = {
  NODE_ENV: "development",
  PORT: String(API),
  CORS_ORIGINS: `http://localhost:${WEB}`,
  MONGODB_URI: `mongodb://127.0.0.1:${MONGO}/curvefit_e2e`,
  JWT_ACCESS_SECRET: "e".repeat(40),
  JWT_REFRESH_SECRET: "f".repeat(40),
  WEB_URL: `http://localhost:${WEB}`,
  RATE_LIMIT_SCALE: "6",
  PUBLIC_API_URL: `http://localhost:${API}`,
  UPLOAD_DIR: uploadDir,
};

// Use the system Chrome when one is installed (no browser download); CI installs Chromium.
const channel = process.env.CI ? undefined : "chrome";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${WEB}`, trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      testIgnore: /mobile.spec.ts/,
      use: { ...devices["Desktop Chrome"], channel },
    },
    {
      name: "mobile",
      // Mobile checks the shopping path only: the OTP rate limit is shared with desktop.
      testMatch: /mobile\.spec\.ts/,
      use: { ...devices["Pixel 7"], channel },
    },
  ],
  webServer: [
    {
      // Fresh local MongoDB on its own port and folder.
      command: `node -e "for (const p of [process.env.DEV_DB_PATH, process.env.UPLOAD_DIR]) require('fs').rmSync(p,{recursive:true,force:true})" && npm run dev:db -w @curvefit/api`,
      env: { DEV_DB_PATH: dataDir, DEV_DB_PORT: String(MONGO), UPLOAD_DIR: uploadDir },
      port: MONGO,
      timeout: 180_000,
      reuseExistingServer: false,
    },
    {
      command: "npm run seed -w @curvefit/api -- --demo && npx tsx apps/api/scripts/e2e-server.ts",
      env: {
        ...apiEnv,
        SEED_ADMIN_EMAIL: "admin@e2e.test",
        SEED_ADMIN_PASSWORD: "e2e-password-1",
      },
      url: `http://localhost:${API}/api/health`,
      timeout: 180_000,
      reuseExistingServer: false,
    },
    {
      command: `npm run build -w @curvefit/web && npm run start -w @curvefit/web -- -p ${WEB}`,
      env: {
        NEXT_PUBLIC_API_URL: `http://localhost:${API}/api`,
        DEMO_CHECKOUT: "1",
        NEXT_PUBLIC_DEMO_CHECKOUT: "1",
      },
      url: `http://localhost:${WEB}`,
      timeout: 300_000,
      reuseExistingServer: false,
    },
  ],
});
