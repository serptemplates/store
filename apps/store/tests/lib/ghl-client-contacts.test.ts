import { afterEach, describe, expect, it, vi } from "vitest";

const originalFetch = global.fetch;

describe("syncOrderWithGhl custom field payloads", () => {
  afterEach(() => {
    global.fetch = originalFetch;
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("sends purchase metadata and license payload JSON when custom fields are configured", async () => {
    vi.resetModules();
    vi.stubEnv("GHL_PAT_LOCATION", "test_token");
    vi.stubEnv("GHL_LOCATION_ID", "location_123");
    vi.stubEnv("GHL_CUSTOM_FIELD_PURCHASE_METADATA", "cf_purchase");
    vi.stubEnv("GHL_CUSTOM_FIELD_LICENSE_KEYS_V2", "cf_license");

    const makeResponse = (body: unknown) => ({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify(body)),
    });

    const fetchMock = vi.fn().mockResolvedValue(makeResponse({
      contact: { id: "contact_123" },
    }));

    global.fetch = fetchMock as unknown as typeof global.fetch;

    const { syncOrderWithGhl } = await import("@/lib/ghl-client");

    const config: Parameters<typeof syncOrderWithGhl>[0] = {};
    const context: Parameters<typeof syncOrderWithGhl>[1] = {
      offerId: "demo-offer",
      offerName: "Demo Offer",
      customerEmail: "buyer@example.com",
      customerName: "Buyer Example",
      stripeSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_test_123",
      amountTotal: 9900,
      amountFormatted: "$99.00",
      currency: "usd",
      landerId: "demo-lander",
      metadata: {
        productPageUrl: "https://store.example.com/products/demo-offer",
        purchaseUrl: "https://store.example.com/checkout/demo-offer",
      },
      provider: "stripe",
      licenseKey: "KEY-123",
      licenseId: "license_123",
      licenseAction: "created",
      licenseEntitlements: ["demo-offer", "pro"],
      licenseTier: "demo-offer",
    };

    const result = await syncOrderWithGhl(config, context);
    expect(result).toEqual({ contactId: "contact_123", opportunityCreated: false });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = fetchMock.mock.calls[0][1];
    expect(request).toBeDefined();

    const parsedBody = JSON.parse((request as RequestInit).body as string) as {
      customFields?: Array<{ id: string; value: string }>;
    };

    expect(parsedBody.customFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "cf_purchase" }),
        expect.objectContaining({ id: "cf_license" }),
      ]),
    );

    const purchaseField = parsedBody.customFields?.find((field) => field.id === "cf_purchase");
    const licenseField = parsedBody.customFields?.find((field) => field.id === "cf_license");

    expect(purchaseField).toBeTruthy();
    expect(licenseField).toBeTruthy();

    const purchasePayload = JSON.parse(purchaseField!.value);
    expect(purchasePayload).toMatchObject({
      provider: "stripe",
      product: expect.objectContaining({
        pageUrl: "https://store.example.com/products/demo-offer",
      }),
      license: expect.objectContaining({
        key: "KEY-123",
        entitlements: ["demo-offer", "pro"],
      }),
    });

    const licensePayload = JSON.parse(licenseField!.value);
    expect(licensePayload).toMatchObject({
      key: "KEY-123",
      entitlements: ["demo-offer", "pro"],
      tier: "demo-offer",
    });
  });

  it("infers custom field IDs from default field keys when not explicitly configured", async () => {
    vi.resetModules();
    vi.stubEnv("GHL_PAT_LOCATION", "test_token");
    vi.stubEnv("GHL_LOCATION_ID", "location_123");

    const makeResponse = (body: unknown) => ({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify(body)),
    });

    const responses = [
      makeResponse({
        customFields: [
          { id: "resolved_purchase", fieldKey: "contact.purchase_metadata" },
          { id: "resolved_license", fieldKey: "contact.license_keys_v2" },
        ],
      }),
      makeResponse({ contact: { id: "contact_789" } }),
    ];

    const fetchMock = vi.fn(() => Promise.resolve(responses.shift()!));

    global.fetch = fetchMock as unknown as typeof global.fetch;

    const { syncOrderWithGhl } = await import("@/lib/ghl-client");

    const config: Parameters<typeof syncOrderWithGhl>[0] = {};
    const context: Parameters<typeof syncOrderWithGhl>[1] = {
      offerId: "demo-offer",
      offerName: "Demo Offer",
      customerEmail: "buyer@example.com",
      customerName: "Buyer Example",
      stripeSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_test_123",
      amountTotal: 9900,
      amountFormatted: "$99.00",
      currency: "usd",
      landerId: "demo-lander",
      metadata: {
        productPageUrl: "https://store.example.com/products/demo-offer",
        purchaseUrl: "https://store.example.com/checkout/demo-offer",
      },
      provider: "stripe",
      licenseKey: "KEY-123",
      licenseId: "license_123",
      licenseAction: "created",
      licenseEntitlements: ["demo-offer", "pro"],
      licenseTier: "demo-offer",
    };

    const result = await syncOrderWithGhl(config, context);
    expect(result).toEqual({ contactId: "contact_789", opportunityCreated: false });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const calls = fetchMock.mock.calls as unknown[][];
    expect(calls.length).toBeGreaterThanOrEqual(2);

    const customFieldRequest = calls[0]?.[0];
    expect(typeof customFieldRequest).toBe("string");
    if (typeof customFieldRequest !== "string") {
      throw new Error("Expected custom field request URL to be defined");
    }
    expect(customFieldRequest).toContain("/customFields");

    const request = calls[1]?.[1] as RequestInit | undefined;
    expect(request).toBeDefined();

    if (!request) {
      throw new Error("Expected contact upsert request to be defined");
    }

    const parsedBody = JSON.parse((request.body as string) ?? "{}") as {
      customFields?: Array<{ id: string; value: string }>;
    };

    expect(parsedBody.customFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "resolved_purchase" }),
        expect.objectContaining({ id: "resolved_license" }),
      ]),
    );

    const purchaseField = parsedBody.customFields?.find((field) => field.id === "resolved_purchase");
    const licenseField = parsedBody.customFields?.find((field) => field.id === "resolved_license");

    expect(purchaseField).toBeTruthy();
    expect(licenseField).toBeTruthy();

    const purchasePayload = JSON.parse(purchaseField!.value);
    expect(purchasePayload).toMatchObject({
      provider: "stripe",
      product: expect.objectContaining({
        pageUrl: "https://store.example.com/products/demo-offer",
      }),
      license: expect.objectContaining({
        key: "KEY-123",
        entitlements: ["demo-offer", "pro"],
      }),
    });

    const licensePayload = JSON.parse(licenseField!.value);
    expect(licensePayload).toMatchObject({
      key: "KEY-123",
      entitlements: ["demo-offer", "pro"],
      tier: "demo-offer",
    });
  });
});
