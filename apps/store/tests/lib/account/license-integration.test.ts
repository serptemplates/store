import { describe, expect, it } from "vitest";

import {
  mergePurchasesWithGhlLicenses,
  type PurchaseSummary,
} from "@/lib/account/license-integration";
import type { GhlLicenseRecord } from "@/lib/ghl-client";

function createLicense(overrides: Partial<GhlLicenseRecord>): GhlLicenseRecord {
  return {
    key: "SERP-DEFAULT",
    id: null,
    action: null,
    entitlements: [],
    tier: null,
    url: null,
    offerId: null,
    sourceField: "contact.license_keys_v2",
    issuedAt: null,
    raw: {},
    ...overrides,
  };
}

function createPurchase(overrides: Partial<PurchaseSummary>): PurchaseSummary {
  return {
    orderId: "ord_1",
    offerId: "demo-offer",
    purchasedAt: "2025-10-10T10:00:00.000Z",
    amountFormatted: "$99.00",
    source: "stripe",
    licenseKey: null,
    licenseStatus: null,
    licenseUrl: null,
    ...overrides,
  };
}

describe("mergePurchasesWithGhlLicenses", () => {
  it("fills missing licenses for purchases that share the same offer", () => {
    const purchases = [
      createPurchase({
        offerId: "demo-offer",
      }),
    ];

    const licenses = [
      createLicense({
        key: "SERP-DEMO-001",
        action: "created",
        entitlements: ["demo-offer"],
        offerId: "demo-offer",
        issuedAt: "2025-10-09T09:00:00.000Z",
      }),
    ];

    const result = mergePurchasesWithGhlLicenses(purchases, licenses);

    expect(result).toHaveLength(1);
    expect(result[0].licenseKey).toBe("SERP-DEMO-001");
    expect(result[0].licenseStatus).toBe("created");
    expect(result[0].purchasedAt).toBe("2025-10-10T10:00:00.000Z");
  });

  it("updates existing purchases when the same license key is present", () => {
    const purchases = [
      createPurchase({
        licenseKey: "SERP-DEMO-001",
        licenseStatus: null,
      }),
    ];

    const licenses = [
      createLicense({
        key: "SERP-DEMO-001",
        action: "created",
      }),
    ];

    const result = mergePurchasesWithGhlLicenses(purchases, licenses);

    expect(result).toHaveLength(1);
    expect(result[0].licenseKey).toBe("SERP-DEMO-001");
    expect(result[0].licenseStatus).toBe("created");
  });

  it("appends fallback entries for unmatched license records", () => {
    const purchases: PurchaseSummary[] = [];

    const licenses = [
      createLicense({
        key: "SERP-UNMATCHED-999",
        action: "active",
        offerId: "custom-offer",
      }),
    ];

    const result = mergePurchasesWithGhlLicenses(purchases, licenses);

    expect(result).toHaveLength(1);
    expect(result[0].licenseKey).toBe("SERP-UNMATCHED-999");
    expect(result[0].source).toBe("ghl");
    expect(result[0].offerId).toBe("custom-offer");
  });

  it("deduplicates purchases that share an offer while preserving the newest order metadata", () => {
    const purchases = [
      createPurchase({
        orderId: "ord_new",
        offerId: "Demo Offer",
        purchasedAt: "2025-10-12T12:00:00.000Z",
        amountFormatted: "$79.00",
        source: "stripe",
        licenseStatus: "pending",
      }),
      createPurchase({
        orderId: "ord_old",
        offerId: "demo-offer",
        purchasedAt: "2025-10-05T12:00:00.000Z",
        amountFormatted: "$49.00",
        source: "stripe",
        licenseKey: "SERP-OLD-001",
        licenseStatus: "active",
        licenseUrl: "https://example.com/license",
      }),
    ];

    const result = mergePurchasesWithGhlLicenses(purchases, []);

    expect(result).toHaveLength(1);
    expect(result[0].orderId).toBe("ord_new");
    expect(result[0].licenseKey).toBe("SERP-OLD-001");
    expect(result[0].licenseStatus).toBe("active");
    expect(result[0].licenseUrl).toBe("https://example.com/license");
    expect(result[0].amountFormatted).toBe("$79.00");
  });

  it("fills missing metadata from secondary purchases when the primary record is incomplete", () => {
    const purchases = [
      createPurchase({
        orderId: "ord_primary",
        offerId: "combined-offer",
        purchasedAt: null,
        amountFormatted: null,
        source: "unknown",
      }),
      createPurchase({
        orderId: "ord_secondary",
        offerId: "Combined Offer",
        purchasedAt: "2025-10-01T08:00:00.000Z",
        amountFormatted: "$19.00",
        source: "ghl",
        licenseKey: "SERP-COMB-123",
        licenseStatus: "processing",
        licenseUrl: "https://example.com/license/combined",
      }),
    ];

    const result = mergePurchasesWithGhlLicenses(purchases, []);

    expect(result).toHaveLength(1);
    expect(result[0].orderId).toBe("ord_primary");
    expect(result[0].purchasedAt).toBe("2025-10-01T08:00:00.000Z");
    expect(result[0].amountFormatted).toBe("$19.00");
    expect(result[0].source).toBe("ghl");
    expect(result[0].licenseKey).toBe("SERP-COMB-123");
    expect(result[0].licenseStatus).toBe("processing");
    expect(result[0].licenseUrl).toBe("https://example.com/license/combined");
  });
});
