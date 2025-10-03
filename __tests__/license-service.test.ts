import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchLicenseForOrder } from "@/lib/license-service";

const originalFetch = globalThis.fetch;

describe("license service", () => {
  afterEach(() => {
    vi.resetAllMocks();
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    }
    delete process.env.LICENSE_SERVICE_URL;
    delete process.env.LICENSE_SERVICE_TOKEN;
    delete process.env.LICENSE_SERVICE_TIMEOUT_MS;
  });

  it("returns null when endpoint is missing", async () => {
    delete process.env.LICENSE_SERVICE_URL;
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

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ licenseKey: "ABC-123", status: "active", url: "https://license.example.com/manage/ABC-123" }),
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
