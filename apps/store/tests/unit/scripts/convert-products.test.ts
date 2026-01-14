import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import stripJsonComments from "strip-json-comments";

import {
  LEGAL_FAQ_TEMPLATE,
  PERMISSION_JUSTIFICATION_FIELD_ORDER,
  PRICING_FIELD_ORDER,
  PRODUCT_FIELD_ORDER,
  SCREENSHOT_FIELD_ORDER,
  STRIPE_FIELD_ORDER,
} from "@/lib/products/product-schema";

const TEMP_ROOT = path.join(process.cwd(), "tmp");
const TEMP_PREFIX = path.join(TEMP_ROOT, "convert-products-");

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
    await fs.mkdir(TEMP_ROOT, { recursive: true });
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
      trademark_metadata: {
        uses_trademarked_brand: false,
      },
      seo_description: "A concise marketing description.",
      serply_link: "https://serp.ly/sample-product",
      product_page_url: "https://apps.serp.co/sample-product",
      tagline: "Save time instantly",
      featured_image: "/media/products/sample-product/featured.png",
      screenshots: [
        {
          url: "/media/products/sample-product/secondary.png",
          caption: "Secondary caption",
          alt: "Secondary frame",
        },
      ],
      pricing: {
        cta_text: "Get It Now",
      },
      benefits: ["Benefit one"],
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
      categories: ["Downloader", "Utilities"],
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
    const parsed = JSON.parse(stripJsonComments(output)) as Record<string, unknown>;

    const productKeys = Object.keys(parsed);
    const expectedOrder = PRODUCT_FIELD_ORDER.filter((field) => parsed[field] !== undefined);
    expect(productKeys).toEqual(expectedOrder);
    expect(parsed).not.toHaveProperty("stripe");
    expect(parsed).not.toHaveProperty("product_page_url");

    const pricing = parsed.pricing as Record<string, unknown>;
    expect(Object.keys(pricing)).toEqual(PRICING_FIELD_ORDER.filter((field) => pricing[field] !== undefined));
    expect(parsed.benefits).toEqual(["Benefit one"]);
    expect(pricing).not.toHaveProperty("benefits");

    const screenshots = parsed.screenshots as Array<Record<string, unknown>>;
    expect(screenshots).toHaveLength(1);
    expect(Object.keys(screenshots[0])).toEqual(SCREENSHOT_FIELD_ORDER);

    const payment = parsed.payment as Record<string, unknown>;
    const stripe = payment.stripe as Record<string, unknown>;
    expect(Object.keys(stripe)).toEqual(
      STRIPE_FIELD_ORDER.filter((field) => stripe[field] !== undefined),
    );
    const metadata = stripe.metadata as Record<string, unknown>;
    expect(Object.keys(metadata)).toEqual(["alpha", "zulu"]);

    const permissions = parsed.permission_justifications as Array<Record<string, unknown>>;
    expect(Object.keys(permissions[0])).toEqual(
      PERMISSION_JUSTIFICATION_FIELD_ORDER.filter((field) => permissions[0][field] !== undefined),
    );

    const faqs = parsed.faqs as Array<Record<string, string>>;
    expect(faqs).toEqual([
      { question: "Does it work?", answer: "Yes, immediately." },
      { question: LEGAL_FAQ_TEMPLATE.question, answer: LEGAL_FAQ_TEMPLATE.answer },
    ]);
  });

  it("omits downloader-specific legal FAQ for non-downloader products", async () => {
    const slug = "ai-tool";
    await writeProduct(slug, {
      name: "AI Tool",
      slug,
      description: "Generate on-brand assets instantly.",
      tagline: "AI powered",
      seo_title: "AI Tool",
      seo_description: "Generate assets with AI.",
      trademark_metadata: {
        uses_trademarked_brand: false,
      },
      serply_link: `https://serp.ly/${slug}`,
      product_page_url: `https://apps.serp.co/${slug}`,
      faqs: [
        {
          question: "Does support cover prompts?",
          answer: "Yes, every plan includes prompt reviews.",
        },
      ],
      categories: ["Artificial Intelligence"],
      pricing: {},
    });

    const { convertProducts } = await import("@/scripts/convert-products");
    const summary = await convertProducts();

    expect(summary.errors).toBe(0);

    const output = await fs.readFile(productPath(slug), "utf8");
    const parsed = JSON.parse(stripJsonComments(output)) as Record<string, unknown>;
    const faqs = parsed.faqs as Array<Record<string, string>>;

    expect(faqs).toEqual([
      {
        question: "Does support cover prompts?",
        answer: "Yes, every plan includes prompt reviews.",
      },
    ]);
  });

  it("supports dry-run checks without writing files", async () => {
    const slug = "dry-run-product";
    await writeProduct(slug, {
      name: "Dry Run Product",
      slug,
      trademark_metadata: {
        uses_trademarked_brand: false,
      },
      tagline: "Preview only",
      description: "Dry run description.",
      seo_title: "Dry Run Title",
      seo_description: "Dry run description text.",
      serply_link: "https://serp.ly/dry-run-product",
      product_page_url: "https://apps.serp.co/dry-run-product",
      pricing: {},
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
      trademark_metadata: {
        uses_trademarked_brand: false,
      },
      name: "Needs Format",
      description: "Out of order fields.",
      seo_description: "Needs format",
      seo_title: "Needs format",
      serply_link: "https://serp.ly/needs-format",
      product_page_url: "https://apps.serp.co/needs-format",
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
