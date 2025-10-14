import type Stripe from "stripe";

export function normalizeMetadata(metadata: Stripe.Metadata | null | undefined): Record<string, string> {
  if (!metadata) {
    return {};
  }

  return Object.entries(metadata).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === "string") {
      acc[key] = value;
    }
    return acc;
  }, {});
}
