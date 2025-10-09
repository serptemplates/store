import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "__tests__/**/*.test.ts?(x)",
      "lib/**/*.test.ts?(x)",
      "tests/**/*.test.ts?(x)",
    ],
    environment: "jsdom",
    reporters: "default",
    clearMocks: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});
