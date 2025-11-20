import { describe, expect, it } from "vitest";

import {
  defaultAdapters,
  getAdapter,
  listAvailableProviders,
  requiredFieldsForProvider,
  stripeCheckoutAdapter,
  type PaymentProviderId,
} from "@repo/payments";

describe("payments package adapter registry", () => {
  it("returns registered adapters from the default registry", () => {
    const provider: PaymentProviderId = "stripe";
    const adapter = getAdapter(provider, defaultAdapters);
    expect(adapter).toBe(stripeCheckoutAdapter);
  });

  it("lists available providers with required fields", () => {
    const providers = listAvailableProviders();
    expect(providers.map((p) => p.id)).toContain("paypal");

    const stripeFields = requiredFieldsForProvider("stripe");
    expect(stripeFields.some((field) => field.key.includes("price_id"))).toBe(true);
  });
});
