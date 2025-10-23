import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "tests/unit/**/*.test.ts?(x)",
      "tests/component/**/*.test.ts?(x)",
      "tests/integration/**/*.test.ts?(x)",
      "tests/manual/**/*.test.ts?(x)",
    ],
    exclude: [
      "tests/e2e/**",
      "tests/**/staging/**",
    ],
    environment: "jsdom",
    reporters: "default",
    clearMocks: true,
    env: {
      LOG_SILENT: "true",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});
