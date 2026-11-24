import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Integration tests start an in-memory MongoDB, which can be slow the first time.
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
});
