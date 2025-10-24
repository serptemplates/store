import { describe, expect, it } from "vitest";

import { validateProducts } from "@/scripts/validate-products";

describe("Content integrity", () => {
  it("matches product schema", async () => {
    const result = await validateProducts({ skipPriceManifest: true });

    if (result.errors.length > 0) {
      throw new Error(result.errors.join("\n"));
    }

    expect(result.errors).toHaveLength(0);
  });
});
