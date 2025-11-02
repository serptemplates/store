import { afterEach, describe, expect, it, vi } from "vitest";

const originalFetch = global.fetch;

const makeJsonResponse = (body: unknown) => ({
  ok: true,
  status: 200,
  json: vi.fn().mockResolvedValue(body),
  text: vi.fn().mockResolvedValue(JSON.stringify(body)),
});

function toUrlString(input: unknown): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  if (input && typeof input === "object" && "url" in input && typeof (input as { url: unknown }).url === "string") {
    return (input as { url: string }).url;
  }
  return "";
}

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

    const fetchMock = vi.fn((input: unknown) => {
      const url = toUrlString(input);
      if (url.includes("/contacts/search")) {
        return Promise.resolve(makeJsonResponse({ contacts: [] }));
      }
      return Promise.resolve(
        makeJsonResponse({
          contact: { id: "contact_123" },
        }),
      );
    });

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

    // contacts.search (existing purchase metadata) + contacts.search (tag merge) + contacts.upsert
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const calls = fetchMock.mock.calls as Array<[unknown, RequestInit?]>;
    const upsertCall = calls.find(([requestUrl]) =>
      toUrlString(requestUrl).includes("/contacts/upsert"),
    );

    const request = upsertCall?.[1] as RequestInit | undefined;
    expect(request).toBeDefined();

    if (!request) {
      throw new Error("Expected contact upsert request to be defined");
    }

    const parsedBody = JSON.parse((request.body as string) ?? "{}") as {
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

    const fetchMock = vi.fn((input: unknown) => {
      const url = toUrlString(input);
      if (url.includes("/customFields")) {
        return Promise.resolve(
          makeJsonResponse({
            customFields: [
              { id: "resolved_purchase", fieldKey: "contact.purchase_metadata" },
              { id: "resolved_license", fieldKey: "contact.license_keys_v2" },
            ],
          }),
        );
      }
      if (url.includes("/contacts/search")) {
        return Promise.resolve(makeJsonResponse({ contacts: [] }));
      }
      return Promise.resolve(makeJsonResponse({ contact: { id: "contact_789" } }));
    });

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

    // customFields + contacts.search (existing purchase metadata) + contacts.search (tag merge) + contacts.upsert
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const calls = fetchMock.mock.calls as Array<[unknown, RequestInit?]>;
    expect(calls.length).toBeGreaterThanOrEqual(3);

    const customFieldRequest = calls.find(([requestUrl]) =>
      toUrlString(requestUrl).includes("/customFields"),
    )?.[0];
    expect(typeof customFieldRequest).toBe("string");
    if (typeof customFieldRequest !== "string") {
      throw new Error("Expected custom field request URL to be defined");
    }
    expect(customFieldRequest).toContain("/customFields");

    const upsertCall = calls.find(([requestUrl]) =>
      toUrlString(requestUrl).includes("/contacts/upsert"),
    );
    const request = upsertCall?.[1] as RequestInit | undefined;
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

  it("appends purchase metadata history when an existing record is present", async () => {
    vi.resetModules();
    vi.stubEnv("GHL_PAT_LOCATION", "test_token");
    vi.stubEnv("GHL_LOCATION_ID", "location_123");
    vi.stubEnv("GHL_CUSTOM_FIELD_PURCHASE_METADATA", "cf_purchase");
    vi.stubEnv("GHL_CUSTOM_FIELD_LICENSE_KEYS_V2", "cf_license");

    const existingMetadata = JSON.stringify({
      provider: "stripe",
      product: { id: "demo-offer", name: "Demo Offer" },
      payment: {
        amountCents: 4900,
        currency: "usd",
        stripePaymentIntentId: "pi_old",
      },
    });

    const fetchMock = vi.fn((input: unknown) => {
      const url = toUrlString(input);
      if (url.includes("/contacts/search")) {
        return Promise.resolve(
          makeJsonResponse({
            contacts: [
              {
                id: "contact_123",
                email: "buyer@example.com",
                customFields: [
                  {
                    id: "cf_purchase",
                    value: existingMetadata,
                  },
                ],
                dateUpdated: "2024-01-01T00:00:00Z",
              },
            ],
          }),
        );
      }

      return Promise.resolve(
        makeJsonResponse({
          contact: { id: "contact_123" },
        }),
      );
    });

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

    // contacts.search (existing record) + contacts.search (tag merge) + contacts.upsert
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const calls = fetchMock.mock.calls as Array<[unknown, RequestInit?]>;
    const upsertCall = calls.find(([requestUrl]) =>
      toUrlString(requestUrl).includes("/contacts/upsert"),
    );
    const request = upsertCall?.[1] as RequestInit | undefined;
    expect(request).toBeDefined();

    if (!request) {
      throw new Error("Expected contact upsert request to be defined");
    }

    const parsedBody = JSON.parse((request.body as string) ?? "{}") as {
      customFields?: Array<{ id: string; value: string }>;
    };

    const purchaseField = parsedBody.customFields?.find((field) => field.id === "cf_purchase");
    expect(purchaseField).toBeTruthy();
    const purchasePayload = JSON.parse(purchaseField!.value);

    expect(purchasePayload.payment?.stripePaymentIntentId).toBe("pi_test_123");
    expect(purchasePayload.previousPurchases).toBeDefined();
    expect(Array.isArray(purchasePayload.previousPurchases)).toBe(true);
    expect(purchasePayload.previousPurchases).toHaveLength(1);

    const previousEntry = purchasePayload.previousPurchases[0];
    expect(previousEntry.payment?.stripePaymentIntentId ?? previousEntry.payment?.paymentIntentId).toBe("pi_old");
    expect(previousEntry.product?.id).toBe("demo-offer");
  });
});
