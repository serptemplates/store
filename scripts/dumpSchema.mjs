 import { readFile } from "node:fs/promises";
  import { fileURLToPath } from "node:url";
  import path from "node:path";

  import { createSchemaProduct, generateProductSchemaLD } from "../apps/store/
  schema/product-schema-ld.js";

  const [, , slug = "onlyfans-downloader"] = process.argv;

  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  "..");
  const productPath = path.join(
    rootDir,
    "apps",
    "store",
    "data",
    "products",
    `${slug}.json`
  );

  const rawText = await readFile(productPath, "utf8");
  const product = JSON.parse(rawText);

  const schemaProduct = createSchemaProduct(product, {
    price: product.pricing?.price ?? null,
    isDigital: true,
  });

  const schema = generateProductSchemaLD({
    product: schemaProduct,
    url: `https://apps.serp.co/${product.slug}`,
    storeUrl: "https://apps.serp.co",
    currency: product.pricing?.currency?.toUpperCase() ?? "USD",
    preRelease: product.status === "pre_release",
  });

  console.log(JSON.stringify(schema, null, 2));
