import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  PERMISSION_JUSTIFICATION_FIELD_ORDER,
  PRICING_FIELD_ORDER,
  PRODUCT_FIELD_ORDER,
  SCREENSHOT_FIELD_ORDER,
  STRIPE_FIELD_ORDER,
} from "@/lib/products/product-schema";

const TEMP_PREFIX = path.join(os.tmpdir(), "convert-products-");

describe("scripts/convert-products", () => {
  let tempDir = "";
  let productsDir = "";

  function productPath(slug: string) {
    return path.join(productsDir, `${slug}.json`);
  }

  async function writeProduct(slug: string, value: unknown) {
    const target = productPath(slug);
    const content = `${JSON.stringify(value, null, 2)}\n`;
    await fs.writeFile(target, content, "utf8");
  }

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(TEMP_PREFIX);
    productsDir = path.join(tempDir, "products");
    await fs.mkdir(productsDir, { recursive: true });
    process.env.PRODUCTS_ROOT = tempDir;
    vi.resetModules();
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
    delete process.env.PRODUCTS_ROOT;
    vi.resetModules();
  });

  it("normalizes JSON product files with deterministic ordering", async () => {
    const initial = {
      description: "Sample description body.",
      seo_title: "Sample Product Title",
      name: "Sample Product",
      slug: "sample-product",
      seo_description: "A concise marketing description.",
      serply_link: "https://serp.ly/sample-product",
      apps_serp_co_product_page_url: "https://apps.serp.co/sample-product",
      store_serp_co_product_page_url: "https://store.serp.co/product-details/product/sample-product",
      success_url: "https://apps.serp.co/checkout/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://apps.serp.co/checkout?product=sample-product",
      tagline: "Save time instantly",
      featured_image: "/media/products/sample-product/featured.png",
      payment_link: {
        live_url: "https://buy.stripe.com/sample",
      },
      screenshots: [
        {
          url: "/media/products/sample-product/secondary.png",
          caption: "Secondary caption",
          alt: "Secondary frame",
        },
      ],
      pricing: {
        currency: "usd",
        price: "$10",
        benefits: ["Benefit one"],
      },
      faqs: [
        {
          answer: "Yes, immediately.",
          question: "Does it work?",
        },
      ],
      reviews: [
        {
          rating: 5,
          review: "Works as expected.",
          name: "Alex",
          date: "2024-01-01",
        },
      ],
      permission_justifications: [
        {
          justification: "Needed to monitor downloads.",
          permission: "Browser tabs",
          learn_more_url: "https://example.com/permissions",
        },
      ],
      features: ["One-click downloads"],
      stripe: {
        metadata: {
          zulu: "z",
          alpha: "a",
        },
        price_id: "price_123",
      },
      ghl: {
        stage_id: "stage-1",
        contact_custom_field_ids: {
          custom_two: "value-two",
          custom_one: "value-one",
        },
      },
      license: {
        entitlements: ["personal-use"],
      },
      categories: ["utilities"],
      order_bump: {
        legacy: true,
      },
    };

    await writeProduct("sample-product", initial);

    const { convertProducts } = await import("@/scripts/convert-products");
    const summary = await convertProducts();

    expect(summary.errors).toBe(0);
    expect(summary.outcomes).toHaveLength(1);

    const [outcome] = summary.outcomes;
    expect(outcome.status).toBe("written");
    expect(outcome.changed).toBe(true);
    expect(outcome.warnings).toEqual(["Unrecognised fields: order_bump"]);

    const output = await fs.readFile(productPath("sample-product"), "utf8");
    const parsed = JSON.parse(output) as Record<string, unknown>;

    const productKeys = Object.keys(parsed);
    const expectedOrder = PRODUCT_FIELD_ORDER.filter((field) => parsed[field] !== undefined);
    expect(productKeys).toEqual(expectedOrder);

    const pricing = parsed.pricing as Record<string, unknown>;
    expect(pricing.currency).toBe("USD");
    expect(Object.keys(pricing)).toEqual(PRICING_FIELD_ORDER.filter((field) => pricing[field] !== undefined));

    const screenshots = parsed.screenshots as Array<Record<string, unknown>>;
    expect(screenshots).toHaveLength(1);
    expect(Object.keys(screenshots[0])).toEqual(SCREENSHOT_FIELD_ORDER);

    const stripe = parsed.stripe as Record<string, unknown>;
    expect(Object.keys(stripe)).toEqual(
      STRIPE_FIELD_ORDER.filter((field) => stripe[field] !== undefined),
    );
    const metadata = stripe.metadata as Record<string, unknown>;
    expect(Object.keys(metadata)).toEqual(["alpha", "zulu"]);

    const permissions = parsed.permission_justifications as Array<Record<string, unknown>>;
    expect(Object.keys(permissions[0])).toEqual(
      PERMISSION_JUSTIFICATION_FIELD_ORDER.filter((field) => permissions[0][field] !== undefined),
    );
  });

  it("supports dry-run checks without writing files", async () => {
    const slug = "dry-run-product";
    await writeProduct(slug, {
      name: "Dry Run Product",
      slug,
      tagline: "Preview only",
      description: "Dry run description.",
      seo_title: "Dry Run Title",
      seo_description: "Dry run description text.",
      serply_link: "https://serp.ly/dry-run-product",
      store_serp_co_product_page_url: "https://store.serp.co/product-details/product/dry-run-product",
      apps_serp_co_product_page_url: "https://apps.serp.co/dry-run-product",
      success_url: "https://apps.serp.co/checkout/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://apps.serp.co/checkout?product=dry-run-product",
      pricing: { price: "$10" },
    });

    const before = await fs.readFile(productPath(slug), "utf8");

    const { convertProducts } = await import("@/scripts/convert-products");
    const summary = await convertProducts({ dryRun: true });

    expect(summary.errors).toBe(0);
    const [outcome] = summary.outcomes;
    expect(outcome.status).toBe("dry-run");
    expect(outcome.changed).toBe(true);

    const after = await fs.readFile(productPath(slug), "utf8");
    expect(after).toBe(before);
  });

  it("flags reformatting needs in check mode", async () => {
    const slug = "needs-format";
    await writeProduct(slug, {
      slug,
      name: "Needs Format",
      description: "Out of order fields.",
      seo_description: "Needs format",
      seo_title: "Needs format",
      serply_link: "https://serp.ly/needs-format",
      store_serp_co_product_page_url: "https://store.serp.co/product-details/product/needs-format",
      apps_serp_co_product_page_url: "https://apps.serp.co/needs-format",
      success_url: "https://apps.serp.co/checkout/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://apps.serp.co/checkout?product=needs-format",
      tagline: "Messy order",
    });

    const before = await fs.readFile(productPath(slug), "utf8");

    const { convertProducts } = await import("@/scripts/convert-products");
    const summary = await convertProducts({ check: true });

    expect(summary.errors).toBe(0);
    expect(summary.changed).toBe(1);
    const [outcome] = summary.outcomes;
    expect(outcome.status).toBe("dry-run");
    expect(outcome.changed).toBe(true);

    const after = await fs.readFile(productPath(slug), "utf8");
    expect(after).toBe(before);
  });
});
