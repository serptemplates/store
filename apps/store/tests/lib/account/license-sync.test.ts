import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ghl-client", () => ({
  fetchContactLicensesByEmail: vi.fn(),
}));

vi.mock("@/lib/checkout/orders", () => ({
  upsertOrder: vi.fn(),
  findOrdersByEmailAndSource: vi.fn(),
  deleteOrderById: vi.fn(),
}));

import type { AccountRecord } from "@/lib/account/store";
import { syncAccountLicensesFromGhl } from "@/lib/account/license-sync";
import { fetchContactLicensesByEmail } from "@/lib/ghl-client";
import {
  upsertOrder,
  findOrdersByEmailAndSource,
  deleteOrderById,
} from "@/lib/checkout/orders";

const mockedFetch = vi.mocked(fetchContactLicensesByEmail);
const mockedUpsert = vi.mocked(upsertOrder);
const mockedFindOrders = vi.mocked(findOrdersByEmailAndSource);
const mockedDelete = vi.mocked(deleteOrderById);

const baseAccount: AccountRecord = {
  id: "acc_123",
  email: "customer@example.com",
  name: "Customer",
  status: "active",
  verifiedAt: new Date(),
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("syncAccountLicensesFromGhl", () => {
  it("upserts orders for each fetched license and prunes stale entries", async () => {
    mockedFetch.mockResolvedValue([
      {
        key: "SERP-ABC-123",
        id: "lic_1",
        action: "active",
        entitlements: ["demo"],
        tier: "demo-tier",
        url: "https://example.com/license",
        offerId: "demo-offer",
        sourceField: "customField.license_keys",
        issuedAt: "2024-01-01T00:00:00.000Z",
        raw: {},
      },
    ]);

    mockedFindOrders.mockResolvedValue([
      {
        id: "order_old",
        checkoutSessionId: null,
        stripeSessionId: null,
        stripePaymentIntentId: "ghl_license:obsolete",
        stripeChargeId: null,
        offerId: "old-offer",
        landerId: null,
        customerEmail: baseAccount.email,
        customerName: baseAccount.name,
        amountTotal: null,
        currency: null,
        metadata: {},
        paymentStatus: "active",
        paymentMethod: "ghl",
        source: "ghl",
        createdAt: new Date(),
        updatedAt: new Date(),
        checkoutSessionStatus: null,
        checkoutSessionSource: "ghl",
      },
    ]);

    await syncAccountLicensesFromGhl(baseAccount);

    expect(mockedUpsert).toHaveBeenCalledTimes(1);
    expect(mockedUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        stripePaymentIntentId: "ghl_license:serp-abc-123",
        customerEmail: baseAccount.email,
        source: "ghl",
      }),
    );

    expect(mockedDelete).toHaveBeenCalledWith("order_old");
  });

  it("removes all stored GHL orders when no licenses are returned", async () => {
    mockedFetch.mockResolvedValue([]);

    mockedFindOrders.mockResolvedValue([
      {
        id: "order_one",
        checkoutSessionId: null,
        stripeSessionId: null,
        stripePaymentIntentId: "ghl_license:serp-one",
        stripeChargeId: null,
        offerId: "demo-offer",
        landerId: null,
        customerEmail: baseAccount.email,
        customerName: baseAccount.name,
        amountTotal: null,
        currency: null,
        metadata: {},
        paymentStatus: "active",
        paymentMethod: "ghl",
        source: "ghl",
        createdAt: new Date(),
        updatedAt: new Date(),
        checkoutSessionStatus: null,
        checkoutSessionSource: "ghl",
      },
    ]);

    await syncAccountLicensesFromGhl(baseAccount);

    expect(mockedUpsert).not.toHaveBeenCalled();
    expect(mockedDelete).toHaveBeenCalledWith("order_one");
  });

  it("does not prune existing data when the GHL lookup fails", async () => {
    mockedFetch.mockRejectedValue(new Error("network"));

    await syncAccountLicensesFromGhl(baseAccount);

    expect(mockedUpsert).not.toHaveBeenCalled();
    expect(mockedFindOrders).not.toHaveBeenCalled();
    expect(mockedDelete).not.toHaveBeenCalled();
  });
});
