import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "__tests__/**/*.test.ts?(x)",
      "lib/**/*.test.ts?(x)",
      "tests/**/*.test.ts?(x)",
    ],
    exclude: [
      "tests/e2e/**",
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
