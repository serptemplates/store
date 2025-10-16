import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { findPriceEntry, formatAmountFromCents } from "@/lib/pricing/price-manifest";

function parsePrice(value?: string | null): number | null {
  if (!value) return null;
  const match = value.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

describe("price manifest", () => {
  const productsDir = path.resolve(process.cwd(), "data", "products");
  const productFiles = readdirSync(productsDir).filter((file) => /\.ya?ml$/i.test(file));

  it("keeps manifest amounts in sync with product copy", () => {
    const mismatches: string[] = [];

    for (const file of productFiles) {
      const absolutePath = path.join(productsDir, file);
      const raw = readFileSync(absolutePath, "utf8");
      const product = parse(raw) as Record<string, unknown> | null;
      if (!product) continue;

      const stripe = product?.stripe as { price_id?: string } | undefined;
      if (!stripe?.price_id) continue;

      const manifestEntry = findPriceEntry(stripe.price_id, undefined);
      if (!manifestEntry) continue;

      const pricing = product?.pricing as { price?: string | null } | undefined;
      const declaredPrice = parsePrice(pricing?.price ?? null);
      if (declaredPrice == null) continue;

      const manifestPrice = manifestEntry.unitAmount / 100;
      if (Math.abs(manifestPrice - declaredPrice) > 0.005) {
        mismatches.push(
          `${file}: Stripe price ${formatAmountFromCents(manifestEntry.unitAmount, manifestEntry.currency)} does not match YAML price ${pricing?.price ?? declaredPrice}`,
        );
      }
    }

    expect(mismatches).toEqual([]);
  });
});
