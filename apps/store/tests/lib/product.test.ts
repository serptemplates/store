import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import path from "node:path";

const fixturesRoot = path.resolve(__dirname, "..", "fixtures");

async function loadProductModule() {
  return import("@/lib/product");
}

beforeEach(() => {
  process.env.PRODUCTS_ROOT = fixturesRoot;
  process.env.SITE_CONFIG_PATH = path.join(fixturesRoot, "site.config.json");
  vi.resetModules();
});

afterEach(() => {
  delete process.env.PRODUCTS_ROOT;
  delete process.env.SITE_CONFIG_PATH;
  vi.resetModules();
});

describe("lib/product", () => {
  it("returns sorted product slugs and excludes configured entries", async () => {
    const { getProductSlugs } = await loadProductModule();
    const slugs = getProductSlugs();

    expect(slugs).toEqual(["another-product", "test-product"]);
  });

  it("returns first product when slug omitted", async () => {
    const { getProductData } = await loadProductModule();
    const product = getProductData();

    expect(product.slug).toBe("another-product");
    expect(product.name).toBe("Another Product");
  });

  it("caches product lookups", async () => {
    const { getProductData } = await loadProductModule();

    const first = getProductData("test-product");
    const second = getProductData("test-product");

    expect(first).toBe(second);
  });

  it("returns all products", async () => {
    const { getAllProducts } = await loadProductModule();
    const products = getAllProducts();

    expect(products).toHaveLength(2);
    expect(products.map((p) => p.slug)).toEqual(["another-product", "test-product"]);
  });
});
