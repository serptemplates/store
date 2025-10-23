import { describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

import {
  buildPaymentLinkUpdatePayload,
  buildSuccessRedirectUrl,
  ensureTermsOfServiceRequired,
} from "@/lib/stripe/payment-link-config";

describe("payment-link config helpers", () => {
  it("buildSuccessRedirectUrl encodes required analytics params", () => {
    const url = buildSuccessRedirectUrl({
      baseUrl: "https://apps.serp.co/checkout/success",
      slug: "rawpixel-downloader",
      paymentLinkId: "plink_123",
      mode: "test",
    });

    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://apps.serp.co/checkout/success");
    expect(parsed.searchParams.get("provider")).toBe("stripe");
    expect(parsed.searchParams.get("slug")).toBe("rawpixel-downloader");
    expect(parsed.searchParams.get("payment_link_id")).toBe("plink_123");
    expect(parsed.searchParams.get("mode")).toBe("test");
    expect(url.endsWith("session_id={CHECKOUT_SESSION_ID}")).toBe(true);
  });

  it("buildPaymentLinkUpdatePayload mirrors metadata to payment_intent_data", () => {
    const payload = buildPaymentLinkUpdatePayload({
      slug: "rawpixel-downloader",
      ghlTag: "purchase-rawpixel-downloader",
      stripeProductId: "prod_123",
      paymentLinkId: "plink_123",
      mode: "live",
      baseUrl: "https://apps.serp.co/checkout/success",
      productName: "Rawpixel Downloader",
    });

    expect(payload.allow_promotion_codes).toBe(true);
    expect(payload.after_completion?.type).toBe("redirect");
    expect(payload.after_completion?.redirect?.url).toContain("provider=stripe");
    expect(payload.after_completion?.redirect?.url).toContain("slug=rawpixel-downloader");
    expect(payload.after_completion?.redirect?.url).toContain("mode=live");
    expect(payload.after_completion?.redirect?.url).toContain("session_id={CHECKOUT_SESSION_ID}");

    expect(payload.metadata).toMatchObject({
      product_slug: "rawpixel-downloader",
      ghl_tag: "purchase-rawpixel-downloader",
      stripe_product_id: "prod_123",
      payment_link_mode: "live",
    });
    expect(payload.payment_intent_data?.metadata).toEqual(payload.metadata);
    expect(payload.payment_intent_data?.description).toBe("SERP Apps - Rawpixel Downloader");
  });

  it("ensureTermsOfServiceRequired skips update when already enabled", async () => {
    const stripeStub = {
      paymentLinks: {
        retrieve: vi.fn().mockResolvedValue({
          consent_collection: { terms_of_service: "required" },
        }),
        update: vi.fn(),
      },
    } as unknown as Stripe;

    const result = await ensureTermsOfServiceRequired(stripeStub, "plink_123");
    expect(result).toEqual({ status: "already_required" });
    expect(stripeStub.paymentLinks.update).not.toHaveBeenCalled();
  });

  it("ensureTermsOfServiceRequired enables the consent toggle when missing", async () => {
    const updateMock = vi.fn().mockResolvedValue({});
    const stripeStub = {
      paymentLinks: {
        retrieve: vi.fn().mockResolvedValue({ consent_collection: null }),
        update: updateMock,
      },
    } as unknown as Stripe;

    const result = await ensureTermsOfServiceRequired(stripeStub, "plink_abc");
    expect(result).toEqual({ status: "updated" });
    expect(updateMock).toHaveBeenCalledWith("plink_abc", {
      consent_collection: { terms_of_service: "required" },
    });
  });

  it("ensureTermsOfServiceRequired surfaces manual fallback when Stripe rejects the payload", async () => {
    const error = Object.assign(new Error("Received unknown parameter: consent_collection"), {
      code: "parameter_unknown",
    });
    const stripeStub = {
      paymentLinks: {
        retrieve: vi.fn().mockResolvedValue({ consent_collection: null }),
        update: vi.fn().mockRejectedValue(error),
      },
    } as unknown as Stripe;

    const result = await ensureTermsOfServiceRequired(stripeStub, "plink_manual");
    expect(result.status).toBe("manual_required");
    expect(result.reason).toContain("consent_collection");
  });
});
