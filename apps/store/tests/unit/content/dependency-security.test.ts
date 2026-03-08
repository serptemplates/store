import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("dependency security", () => {
  it("pins next-mdx-remote to a non-vulnerable major version", () => {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
      dependencies?: Record<string, string>;
    };

    const nextMdxRemoteVersion = packageJson.dependencies?.["next-mdx-remote"];
    expect(nextMdxRemoteVersion).toBeDefined();

    const majorVersion = Number.parseInt(String(nextMdxRemoteVersion).replace(/^[^\d]*/, "").split(".")[0] ?? "0", 10);
    expect(majorVersion).toBeGreaterThanOrEqual(6);
  });
});
