import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import stripJsonComments from "strip-json-comments";

import { PAYMENT_PROVIDERS, type PaymentProviderId } from "../lib/products/payment";
import type { ProductPayment } from "../lib/products/product-schema";
import { normalizeStripeAccountAlias } from "../config/payment-accounts";

type PaymentMode = "payment" | "subscription";
type PaymentConfigPatch = Partial<NonNullable<ProductPayment>>;

type CliArgs = {
  slug: string;
  provider: PaymentProviderId;
  account?: string;
  mode?: PaymentMode;
  successUrl?: string;
  cancelUrl?: string;
  priceId?: string;
  testPriceId?: string;
  providerConfigPath?: string;
  providerConfig?: PaymentConfigPatch;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.join(__dirname, "..");
const repoRoot = path.join(__dirname, "..", "..", "..");

const PAYMENT_PROVIDER_SET = new Set<PaymentProviderId>(PAYMENT_PROVIDERS);

function usage(): never {
  console.log(
    "Usage: pnpm --filter @apps/store update:payment-provider -- --slug <slug> --provider <provider> [--account <alias>] [--mode payment|subscription] [--success-url <url>] [--cancel-url <url>] [--price-id price_xxx] [--test-price-id price_xxx] [--provider-config ./payment-patch.json]",
  );
  process.exit(1);
}

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
      case "provider": {
        const normalized = value?.trim().toLowerCase();
        if (normalized && PAYMENT_PROVIDER_SET.has(normalized as PaymentProviderId)) {
          result.provider = normalized as PaymentProviderId;
        }
        if (rawValue === undefined) i += 1;
        break;
      }
      case "account":
        result.account = value?.trim();
        if (rawValue === undefined) i += 1;
        break;
      case "mode": {
        const normalized = value?.trim().toLowerCase();
        if (normalized === "payment" || normalized === "subscription") {
          result.mode = normalized;
        }
        if (rawValue === undefined) i += 1;
        break;
      }
      case "success-url":
        result.successUrl = value;
        if (rawValue === undefined) i += 1;
        break;
      case "cancel-url":
        result.cancelUrl = value;
        if (rawValue === undefined) i += 1;
        break;
      case "price-id":
        result.priceId = value;
        if (rawValue === undefined) i += 1;
        break;
      case "test-price-id":
        result.testPriceId = value;
        if (rawValue === undefined) i += 1;
        break;
      case "provider-config":
        result.providerConfigPath = value;
        if (rawValue === undefined) i += 1;
        break;
      default:
        break;
    }
  }

  if (!result.slug || !result.provider) {
    usage();
  }

  if (result.account) {
    result.account = normalizeStripeAccountAlias(result.account);
  }

  return result as CliArgs;
}

type ProductData = {
  payment?: {
    provider?: PaymentProviderId;
    account?: string;
    mode?: PaymentMode;
    success_url?: string;
    cancel_url?: string;
    stripe?: {
      price_id?: string;
      test_price_id?: string;
    };
  };
  stripe?: {
    price_id?: string;
    test_price_id?: string;
  };
};

function loadProviderConfigPatch(filePath: string): PaymentConfigPatch {
  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`Provider config file not found: ${absolute}`);
  }
  const raw = fs.readFileSync(absolute, "utf8");
  const parsed = JSON.parse(stripJsonComments(raw));
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Provider config patch must be a JSON object.");
  }
  return parsed as PaymentConfigPatch;
}

function mergeInto(target: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...target };

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      continue;
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      const current = next[key];
      const currentRecord =
        current && typeof current === "object" && !Array.isArray(current) ? (current as Record<string, unknown>) : {};
      next[key] = mergeInto(currentRecord, value as Record<string, unknown>);
      continue;
    }

    next[key] = value;
  }

  return next;
}

type ManifestEntry = {
  slug: string;
  provider: string;
  account?: string;
  mode?: string;
  currency?: string;
  unit_amount?: number;
  stripe?: {
    live_price_id?: string;
    test_price_id?: string;
  };
  whop?: Record<string, unknown>;
  easy_pay_direct?: Record<string, unknown>;
  lemonsqueezy?: Record<string, unknown>;
};

function readProduct(slug: string): { data: ProductData; path: string } {
  const productPath = path.join(appRoot, "data", "products", `${slug}.json`);
  if (!fs.existsSync(productPath)) {
    throw new Error(`Unable to find product JSON at ${productPath}`);
  }
  const raw = fs.readFileSync(productPath, "utf8");
  return { data: JSON.parse(stripJsonComments(raw)), path: productPath };
}

function updateProductPayment(args: CliArgs): void {
  const { data, path: productPath } = readProduct(args.slug);

  if (!data.payment || typeof data.payment !== "object") {
    data.payment = { provider: args.provider };
  }

  data.payment.provider = args.provider;
  if (args.account) {
    data.payment.account = args.account;
  }
  if (args.mode) {
    data.payment.mode = args.mode;
  }
  if (args.successUrl) {
    data.payment.success_url = args.successUrl;
  }
  if (args.cancelUrl) {
    data.payment.cancel_url = args.cancelUrl;
  }

  if (args.provider === "stripe") {
    data.payment.stripe = data.payment.stripe ?? {};
    data.stripe = data.stripe ?? {};

    if (args.priceId) {
      data.payment.stripe.price_id = args.priceId;
      data.stripe.price_id = args.priceId;
    }

    if (args.testPriceId) {
      data.payment.stripe.test_price_id = args.testPriceId;
      data.stripe.test_price_id = args.testPriceId;
    }
  }

  if (args.providerConfig && Object.keys(args.providerConfig).length > 0) {
    const merged = mergeInto(data.payment ?? {}, args.providerConfig as Record<string, unknown>);
    data.payment = merged as ProductData["payment"];
  }

  fs.writeFileSync(productPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function readManifest(): Record<string, ManifestEntry> {
  const manifestPath = path.join(appRoot, "data", "prices", "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error("Price manifest not found. Run update:price first.");
  }
  const raw = fs.readFileSync(manifestPath, "utf8");
  return JSON.parse(raw) as Record<string, ManifestEntry>;
}

function persistManifest(manifest: Record<string, ManifestEntry>) {
  const manifestPath = path.join(appRoot, "data", "prices", "manifest.json");
  const sorted = Object.keys(manifest)
    .sort()
    .reduce<Record<string, ManifestEntry>>((acc, key) => {
      acc[key] = manifest[key];
      return acc;
    }, {});
  fs.writeFileSync(manifestPath, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
}

function updateManifestEntry(args: CliArgs) {
  const manifest = readManifest();
  const entry = manifest[args.slug];

  if (!entry) {
    throw new Error(
      `No manifest entry found for ${args.slug}. Run update:price first so currency/amount metadata exists before switching providers.`,
    );
  }

  entry.provider = args.provider;
  if (args.account) {
    entry.account = args.account;
  }
  if (args.mode) {
    entry.mode = args.mode;
  }

  if (args.provider === "stripe") {
    entry.stripe = entry.stripe ?? {};
    if (args.priceId) {
      entry.stripe.live_price_id = args.priceId;
    }
    if (args.testPriceId) {
      entry.stripe.test_price_id = args.testPriceId;
    }
  }

  if (args.providerConfig && Object.keys(args.providerConfig).length > 0) {
    if (args.providerConfig.whop) {
      entry.whop = args.providerConfig.whop as ManifestEntry["whop"];
    }
    if (args.providerConfig.easy_pay_direct) {
      entry.easy_pay_direct = args.providerConfig.easy_pay_direct as ManifestEntry["easy_pay_direct"];
    }
    if (args.providerConfig.lemonsqueezy) {
      entry.lemonsqueezy = args.providerConfig.lemonsqueezy as ManifestEntry["lemonsqueezy"];
    }
  }

  manifest[args.slug] = entry;
  persistManifest(manifest);
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

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.providerConfigPath) {
    args.providerConfig = loadProviderConfigPatch(args.providerConfigPath);
  }
  console.log(
    `Updating payment provider for ${args.slug} -> provider=${args.provider}${args.account ? ` (account ${args.account})` : ""}`,
  );

  updateProductPayment(args);
  updateManifestEntry(args);

  console.log("▶ Formatting updated product JSON");
  runCommand("pnpm", ["--filter", "@apps/store", "convert:products", "--slug", args.slug]);

  console.log("▶ Validating products");
  runCommand("pnpm", ["--filter", "@apps/store", "validate:products"]);

  console.log("✔ Payment provider update complete. Remember to run lint/typecheck/tests + Playwright checks.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
