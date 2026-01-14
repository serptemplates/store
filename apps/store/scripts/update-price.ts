import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import stripJsonComments from "strip-json-comments";

type CliArgs = {
  slug: string;
  priceCents: number;
  priceId: string;
  testPriceId?: string;
  compareAtCents?: number;
  currency: string;
};

type PreviousIds = {
  priceId?: string;
  testPriceId?: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.join(__dirname, "..");
const repoRoot = path.join(__dirname, "..", "..", "..");

function parseArgs(argv: string[]): CliArgs {
  const result: Partial<CliArgs> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const [rawKey, rawValue] = arg.includes("=") ? arg.split("=", 2) : [arg, undefined];
    const key = rawKey.slice(2);
    const value = rawValue ?? argv[i + 1];
    if (rawValue === undefined && (i + 1 >= argv.length || argv[i + 1].startsWith("--"))) {
      continue;
    }
    switch (key) {
      case "slug":
        result.slug = value;
        if (rawValue === undefined) i += 1;
        break;
      case "price-cents":
        result.priceCents = Number(value);
        if (rawValue === undefined) i += 1;
        break;
      case "price-id":
        result.priceId = value;
        if (rawValue === undefined) i += 1;
        break;
      case "compare-cents":
        result.compareAtCents = Number(value);
        if (rawValue === undefined) i += 1;
        break;
      case "test-price-id":
        result.testPriceId = value;
        if (rawValue === undefined) i += 1;
        break;
      case "currency":
        result.currency = value ?? "usd";
        if (rawValue === undefined) i += 1;
        break;
      default:
        break;
    }
  }

  if (!result.slug || !result.priceId || Number.isNaN(result.priceCents!)) {
    throw new Error(
      "Usage: pnpm --filter @apps/store update:price -- --slug <slug> --price-cents <int> --price-id <price_xxx> [--test-price-id <price_xxx>] [--compare-cents <int>] [--currency usd]",
    );
  }

  return {
    slug: result.slug,
    priceCents: Number(result.priceCents),
    priceId: result.priceId,
    testPriceId: result.testPriceId,
    compareAtCents: result.compareAtCents !== undefined && !Number.isNaN(result.compareAtCents)
      ? Number(result.compareAtCents)
      : undefined,
    currency: (result.currency ?? "usd").toLowerCase(),
  };
}

function formatCurrency(cents: number, currency: string): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  });
  return formatter.format(cents / 100);
}

function runCommand(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    cwd: repoRoot,
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with code ${result.status ?? "unknown"}`);
  }
}

function updateProductFile(args: CliArgs): PreviousIds {
  const productPath = path.join(appRoot, "data", "products", `${args.slug}.json`);
  if (!fs.existsSync(productPath)) {
    throw new Error(`Unable to find product JSON at ${productPath}`);
  }

  const raw = fs.readFileSync(productPath, "utf8");
  const productData = JSON.parse(stripJsonComments(raw));
  const previousPriceId: string | undefined = productData?.payment?.stripe?.price_id;
  const previousTestPriceId: string | undefined = productData?.payment?.stripe?.test_price_id;

  productData.pricing = productData.pricing ?? {};
  productData.pricing.price = formatCurrency(args.priceCents, args.currency);
  if (args.compareAtCents !== undefined) {
    productData.pricing.original_price = formatCurrency(args.compareAtCents, args.currency);
  } else if (productData.pricing.original_price) {
    delete productData.pricing.original_price;
  }

  productData.payment = productData.payment ?? { provider: "stripe" };
  if (!productData.payment.provider) {
    productData.payment.provider = "stripe";
  }
  productData.payment.stripe = productData.payment.stripe ?? {};
  productData.payment.stripe.price_id = args.priceId;
  if (args.testPriceId) {
    productData.payment.stripe.test_price_id = args.testPriceId;
  }

  fs.writeFileSync(productPath, `${JSON.stringify(productData, null, 2)}\n`, "utf8");
  return { priceId: previousPriceId, testPriceId: previousTestPriceId };
}

function updateManifest(args: CliArgs) {
  const manifestPath = path.join(appRoot, "data", "prices", "manifest.json");
  const manifestRaw = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, "utf8") : "{}";
  const manifestData = JSON.parse(manifestRaw) as Record<
    string,
    {
      slug: string;
      provider: string;
      account?: string;
      mode?: string;
      currency: string;
      unit_amount: number;
      compare_at_amount?: number;
      stripe?: { live_price_id?: string; test_price_id?: string };
    }
  >;

  const existing = manifestData[args.slug] ?? {
    slug: args.slug,
    provider: "stripe",
    currency: args.currency,
    unit_amount: args.priceCents,
  };

  existing.slug = args.slug;
  existing.provider = "stripe";
  existing.currency = args.currency;
  existing.unit_amount = args.priceCents;
  if (args.compareAtCents !== undefined) {
    existing.compare_at_amount = args.compareAtCents;
  } else if (existing.compare_at_amount !== undefined) {
    delete existing.compare_at_amount;
  }

  existing.stripe = existing.stripe ?? {};
  existing.stripe.live_price_id = args.priceId;
  if (args.testPriceId) {
    existing.stripe.test_price_id = args.testPriceId;
  }

  manifestData[args.slug] = existing;

  const sortedEntries = Object.keys(manifestData)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = manifestData[key];
      return acc;
    }, {});

  fs.writeFileSync(manifestPath, `${JSON.stringify(sortedEntries, null, 2)}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log(`Updating price for ${args.slug} → ${formatCurrency(args.priceCents, args.currency)}`);

  const previousIds = updateProductFile(args);
  updateManifest(args);

  console.log("▶ Formatting updated product JSON");
  runCommand("pnpm", ["--filter", "@apps/store", "convert:products", "--slug", args.slug]);

  console.log("▶ Validating products");
  runCommand("pnpm", ["--filter", "@apps/store", "validate:products"]);

  console.log("✔ Price update completed. Remember to run lint/typecheck/tests + Playwright checks.");
  if (previousIds.priceId && previousIds.priceId !== args.priceId) {
    console.log(`ℹ Updated live price ID (previously ${previousIds.priceId}).`);
  }
  if (args.testPriceId && previousIds.testPriceId && previousIds.testPriceId !== args.testPriceId) {
    console.log(`ℹ Updated test price ID (previously ${previousIds.testPriceId}).`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
