import { afterEach, describe, expect, it, vi } from "vitest";

const originalFetch = global.fetch;

describe("fetchContactLicensesByEmail", () => {
  afterEach(() => {
    global.fetch = originalFetch;
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("returns empty array when GHL credentials are missing", async () => {
    vi.unstubAllEnvs();

    const { fetchContactLicensesByEmail } = await import("@/lib/ghl-client");
    const result = await fetchContactLicensesByEmail("test@example.com");

    expect(result).toEqual([]);
  });

  it("parses license data from contact custom fields using contacts search endpoint", async () => {
    vi.stubEnv("GHL_PAT_LOCATION", "test_token");
    vi.stubEnv("GHL_LOCATION_ID", "location_123");

    const makeResponse = (body: unknown) => ({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(body),
      text: vi.fn().mockResolvedValue(JSON.stringify(body)),
    });

    const fetchMock = vi.fn((url: RequestInfo | URL) => {
      if (typeof url === "string" && url.includes("/customFields")) {
        return Promise.resolve(makeResponse({
          customFields: [
            { id: "field_license_payload", fieldKey: "contact.license_keys_v2" },
            { id: "field_license_secondary", fieldKey: "contact.license_key_custom_downloader" },
          ],
        }));
      }

      return Promise.resolve(makeResponse({
        contacts: [
          {
            id: "contact_123",
            locationId: "location_123",
            email: "test@example.com",
            phone: null,
            firstName: null,
            lastName: null,
            name: null,
            dateOfBirth: null,
            address1: null,
            city: null,
            state: null,
            country: null,
            postalCode: null,
            companyName: null,
            website: null,
            tags: [],
            source: "automation",
            customFields: [
              {
                id: "field_license_payload",
                value: JSON.stringify({
                  key: "SERP-JSON-123",
                  action: "created",
                  entitlements: ["Demo Offer"],
                  tier: "Pro",
                  offerId: "demo-offer",
                  url: "https://license.example/SERP-JSON-123",
                  createdAt: "2025-10-10T10:00:00Z",
                }),
              },
              {
                id: "field_license_secondary",
                value: " SERP-CUSTOM-456 ",
              },
            ],
            dateAdded: "2025-10-01T00:00:00Z",
            dateUpdated: "2025-10-12T00:00:00Z",
          },
        ],
        total: 1,
      }));
    });

    global.fetch = fetchMock as unknown as typeof global.fetch;

    const { fetchContactLicensesByEmail } = await import("@/lib/ghl-client");

    const licenses = await fetchContactLicensesByEmail("test@example.com");

    const searchCall = fetchMock.mock.calls.find((call) => {
      const [url] = call;
      return typeof url === "string" && url.includes("/contacts/search");
    }) as [string, RequestInit] | undefined;

    expect(searchCall).toBeDefined();

    const [requestUrl, requestInit] = searchCall!;
    expect(requestUrl).toContain("/contacts/search");
    expect(requestInit?.method).toBe("POST");
    const parsedBody = JSON.parse((requestInit?.body as string) ?? "{}");
    expect(parsedBody).toMatchObject({
      locationId: "location_123",
      query: "test@example.com",
      pageLimit: expect.any(Number),
    });

    expect(licenses).toHaveLength(2);

    const jsonLicense = licenses.find((license) => license.key === "SERP-JSON-123");
    expect(jsonLicense).toBeDefined();
    expect(jsonLicense?.action).toBe("created");
    expect(jsonLicense?.entitlements).toContain("demo-offer");
    expect(jsonLicense?.offerId).toBe("demo-offer");
    expect(jsonLicense?.tier).toBe("Pro");
    expect(jsonLicense?.issuedAt).toBe("2025-10-10T10:00:00.000Z");

    const customFieldLicense = licenses.find((license) => license.key === "SERP-CUSTOM-456");
    expect(customFieldLicense).toBeDefined();
    expect(customFieldLicense?.offerId).toBe("custom-downloader");
  });
});
