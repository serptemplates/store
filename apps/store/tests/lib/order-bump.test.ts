import { describe, expect, it, vi, beforeEach } from "vitest";
import { resolveOrderBump } from "@/lib/products/order-bump";
import type { ProductData } from "@/lib/products/product-schema";
import { createTestProduct } from "./google-merchant/test-utils";

vi.mock("@/lib/products/order-bump-definitions", () => ({
  getOrderBumpDefinition: vi.fn(),
}));

const { getOrderBumpDefinition } = await import("@/lib/products/order-bump-definitions");
const getOrderBumpDefinitionMock = vi.mocked(getOrderBumpDefinition);

type ProductOverrides = Parameters<typeof createTestProduct>[0];

const buildProduct = (overrides: ProductOverrides = {}): ProductData =>
  createTestProduct({
    slug: "base-product",
    name: "Base Product",
    pricing: { price: "$67.00" },
    stripe: {
      price_id: "price_base",
      test_price_id: "price_base_test",
      metadata: {},
    },
    order_bump: undefined,
    ...overrides,
  });

beforeEach(() => {
  vi.clearAllMocks();
  getOrderBumpDefinitionMock.mockReturnValue(undefined);
});

describe("resolveOrderBump", () => {
  it("returns undefined when no order bump configured", () => {
    const result = resolveOrderBump(buildProduct());
    expect(result).toBeUndefined();
  });

  it("returns inline order bump details", () => {
    const product = buildProduct({
      order_bump: {
        slug: "priority-support",
        title: "Priority Support",
        price: "$29.00",
        features: ["Priority email"],
        default_selected: false,
        stripe: {
          price_id: "price_support_live",
          test_price_id: "price_support_test",
        },
        enabled: true,
      },
    });

    const bump = resolveOrderBump(product);
    expect(bump).toMatchObject({
      id: "priority-support",
      title: "Priority Support",
      stripePriceId: "price_support_live",
      stripeTestPriceId: "price_support_test",
      priceDisplay: "$29.00",
      points: ["Priority email"],
    });
  });

  it("borrows data from referenced product", () => {
    getOrderBumpDefinitionMock.mockReturnValue({
      slug: "bundle",
      product_slug: "bundle",
      title: "Bundle",
      price: "$47.00",
      features: ["Feature"],
      default_selected: false,
      stripe: {
        price_id: "price_bundle_live",
        test_price_id: "price_bundle_test",
      },
      enabled: true,
    });

    const bump = resolveOrderBump(
      buildProduct({
        order_bump: {
          slug: "bundle",
          product_slug: "bundle",
          features: [],
          default_selected: false,
          enabled: true,
        },
      }),
    );

    expect(bump).toMatchObject({
      id: "bundle",
      title: "Bundle",
      stripePriceId: "price_bundle_live",
      stripeTestPriceId: "price_bundle_test",
      priceDisplay: "$47.00",
      points: ["Feature"],
    });
  });

  it("respects disabled definitions unless explicitly enabled by the product", () => {
    getOrderBumpDefinitionMock.mockReturnValue({
      slug: "bundle",
      product_slug: "bundle",
      title: "Bundle",
      price: "$47.00",
      features: [],
      stripe: {
        price_id: "price_bundle_live",
      },
      enabled: false,
      default_selected: false,
    });

    expect(
      resolveOrderBump(
        buildProduct({
          order_bump: {
            slug: "bundle",
            product_slug: "bundle",
            enabled: true,
            stripe: { price_id: "price_bundle_live" },
          },
        }),
      ),
    ).toMatchObject({
      id: "bundle",
      stripePriceId: "price_bundle_live",
    });

    getOrderBumpDefinitionMock.mockReturnValue({
      slug: "bundle",
      product_slug: "bundle",
      title: "Bundle",
      price: "$47.00",
      features: [],
      stripe: {
        price_id: "price_bundle_live",
      },
      enabled: false,
      default_selected: false,
    });

    expect(
      resolveOrderBump(
        buildProduct({
          order_bump: {
            slug: "bundle",
            product_slug: "bundle",
            enabled: false,
          },
        }),
      ),
    ).toBeUndefined();
  });
});
