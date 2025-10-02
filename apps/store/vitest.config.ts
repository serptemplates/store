import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["__tests__/**/*.test.ts", "lib/**/*.test.ts", "tests/**/*.test.ts"],
    environment: "node",
    reporters: "default",
    clearMocks: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});
