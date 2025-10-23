import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";

const appRoot = path.resolve(__dirname, "../../..");

describe("Content integrity", () => {
  it("matches product schema", () => {
    const result = spawnSync("pnpm", ["exec", "tsx", "scripts/validate-products.ts"], {
      cwd: appRoot,
      encoding: "utf8",
      stdio: "pipe",
    });

    if (result.status !== 0) {
      const stdout = result.stdout?.trim();
      const stderr = result.stderr?.trim();
      const details = [stdout, stderr].filter(Boolean).join("\n\n");
      throw new Error(details || "Product validation failed");
    }

    expect(result.status).toBe(0);
  });
});
