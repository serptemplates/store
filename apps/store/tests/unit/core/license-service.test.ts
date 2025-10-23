import { afterEach, describe, expect, it, vi } from "vitest";

const originalFetch = globalThis.fetch;

async function loadLicenseService() {
  const module = await import("@/lib/license-service");
  return module;
}

describe("license service", () => {
  afterEach(() => {
    vi.resetAllMocks();
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    }
    delete process.env.LICENSE_SERVICE_URL;
    delete process.env.LICENSE_SERVICE_TOKEN;
    delete process.env.LICENSE_SERVICE_TIMEOUT_MS;
    delete process.env.LICENSE_ADMIN_URL;
    delete process.env.LICENSE_KEY_ADMIN_API_KEY;
    delete process.env.LICENSE_ADMIN_TIMEOUT_MS;
    delete process.env.LICENSE_ADMIN_PROVIDER;
    delete process.env.LICENSE_ADMIN_EVENT_TYPE;
    delete process.env.LICENSE_ADMIN_RAW_EVENT_SOURCE;
    delete process.env.LICENSE_ADMIN_PROVIDER_OBJECT_PREFIX;
    vi.resetModules();
  });

  it("returns null when endpoint is missing", async () => {
    delete process.env.LICENSE_SERVICE_URL;
    const { fetchLicenseForOrder } = await loadLicenseService();

    const result = await fetchLicenseForOrder({
      email: "test@example.com",
      offerId: "demo",
      orderId: "order-1",
      source: "stripe",
    });

    expect(result).toBeNull();
  });

  it("parses a license response", async () => {
    process.env.LICENSE_SERVICE_URL = "https://license.example.com/lookup";
    process.env.LICENSE_SERVICE_TOKEN = "api-token";

    vi.resetModules();
    const { fetchLicenseForOrder } = await loadLicenseService();

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          licenseKey: "ABC-123",
          status: "active",
          url: "https://license.example.com/manage/ABC-123",
        }),
    });

    vi.stubGlobal("fetch", fetchSpy as unknown as typeof fetch);

    const result = await fetchLicenseForOrder({
      email: "customer@example.com",
      offerId: "loom-video-downloader",
      orderId: "order-42",
      source: "stripe",
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      licenseKey: "ABC-123",
      status: "active",
      url: "https://license.example.com/manage/ABC-123",
    });
  });
});

describe("createLicenseForOrder", () => {
  afterEach(() => {
    vi.resetAllMocks();
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    }
    delete process.env.LICENSE_ADMIN_URL;
    delete process.env.LICENSE_KEY_ADMIN_API_KEY;
    delete process.env.LICENSE_ADMIN_PROVIDER;
    delete process.env.LICENSE_ADMIN_EVENT_TYPE;
    delete process.env.LICENSE_ADMIN_RAW_EVENT_SOURCE;
    delete process.env.LICENSE_ADMIN_PROVIDER_OBJECT_PREFIX;
    vi.resetModules();
  });

  it("sends enriched payload to the admin endpoint", async () => {
    process.env.LICENSE_ADMIN_URL = "https://license.example.com/admin/purchases";
    process.env.LICENSE_KEY_ADMIN_API_KEY = "secret-key";

    vi.resetModules();
    const { createLicenseForOrder } = await loadLicenseService();

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ licenseKey: "NEW-123", licenseId: "purchase-1", action: "created" }),
    });

    vi.stubGlobal("fetch", fetchSpy as unknown as typeof fetch);

    const result = await createLicenseForOrder({
      id: "evt_123",
      provider: "stripe",
      providerObjectId: "pi_456",
      userEmail: "customer@example.com",
      tier: "pro",
      entitlements: ["demo"],
      features: { seats: 1 },
      metadata: { orderId: "order_789" },
      status: "completed",
      eventType: "checkout.completed",
      amount: 129,
      currency: "usd",
      rawEvent: { eventId: "evt_123" },
      expiresAt: "2024-01-01T00:00:00Z",
    });

    expect(result).toMatchObject({ licenseKey: "NEW-123", licenseId: "purchase-1" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, options] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe("https://license.example.com/admin/purchases");
    expect(options?.method).toBe("POST");
    expect(options?.headers).toMatchObject({
      Authorization: "Bearer secret-key",
      "content-type": "application/json",
    });

    const payload = JSON.parse(String(options?.body));
    expect(payload).toMatchObject({
      id: "evt_123",
      provider: "stripe",
      providerObjectId: "pi_456",
      status: "completed",
      amount: 129,
      currency: "usd",
      rawEvent: { eventId: "evt_123" },
      expiresAt: 1704067200,
    });
    expect(payload.entitlements).toEqual(["demo"]);
    expect(payload.metadata).toMatchObject({ orderId: "order_789" });
  });

  it("skips creation when admin config is missing", async () => {
    delete process.env.LICENSE_ADMIN_URL;
    delete process.env.LICENSE_KEY_ADMIN_API_KEY;

    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy as unknown as typeof fetch);

    const { createLicenseForOrder } = await loadLicenseService();

    const result = await createLicenseForOrder({
      id: "evt_missing",
      provider: "stripe",
      userEmail: "missing@example.com",
    });

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
