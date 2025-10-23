#!/usr/bin/env tsx
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import Stripe from "stripe";
import dotenv from "dotenv";
import { isMap, parse, parseDocument, YAMLMap } from "yaml";

const API_VERSION: Stripe.LatestApiVersion = "2024-04-10";
const REPO_ROOT = path.resolve(__dirname, "../../..");
const PRODUCTS_DIR = path.join(REPO_ROOT, "apps/store/data/products");
const LOG_BASENAME = "stripe-payment-links";
const SUCCESS_REDIRECT_BASE =
  process.env.STRIPE_PAYMENT_LINK_SUCCESS_REDIRECT_URL ??
  "https://apps.serp.co/checkout/success";

type StripeMode = "live" | "test";

type ProductYaml = {
  slug?: unknown;
  name?: unknown;
  success_url?: unknown;
  stripe?: {
    price_id?: unknown;
    test_price_id?: unknown;
    metadata?: Record<string, unknown> | null;
  };
  ghl?: { tag_ids?: unknown };
  payment_link?: {
    live_url?: unknown;
    test_url?: unknown;
    ghl_url?: unknown;
  } | null;
  pricing?: {
    price?: unknown;
    currency?: unknown;
  };
};

type PriceInfo = {
  unitAmount: number;
  currency: string;
};

type ProductRecord = {
  slug: string;
  name: string;
  livePriceId: string | null;
  testPriceId: string | null;
  stripeProductId: string | null;
  stripeTestProductId: string | null;
  ghlTag: string | null;
  paymentLinkLiveUrl: string | null;
  paymentLinkTestUrl: string | null;
  paymentLinkGhlUrl: string | null;
  productPath: string;
  pricing: PriceInfo | null;
};

type ResultEntry = {
  slug: string;
  name: string;
  priceId: string;
  stripeProductId: string | null;
  ghlTag: string | null;
  linkId: string | null;
  url: string;
  mode: StripeMode;
  status: "created" | "skipped" | "error";
  note?: string;
};

const args = process.argv.slice(2);
const modeArg = args.find((arg) => arg.startsWith("--mode="));
const envMode = process.env.STRIPE_PAYMENT_LINK_MODE;
const requestedMode =
  (modeArg ? modeArg.split("=").pop() : undefined) ?? envMode ?? "live";

const MODE: StripeMode =
  requestedMode === "test" || requestedMode === "live"
    ? (requestedMode as StripeMode)
    : "live";

const LOG_PATH = path.join(
  REPO_ROOT,
  "docs/operations",
  MODE === "test" ? `${LOG_BASENAME}-test.md` : `${LOG_BASENAME}.md`,
);

function loadEnvFiles() {
  const candidates = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
    path.join(REPO_ROOT, ".env.local"),
    path.join(REPO_ROOT, ".env"),
  ];

  const loaded = new Set<string>();

  for (const candidate of candidates) {
    if (!loaded.has(candidate) && fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
      loaded.add(candidate);
    }
  }
}

loadEnvFiles();

function updateYamlFile(filePath: string, updater: (doc: import("yaml").Document) => void) {
  const raw = fs.readFileSync(filePath, "utf8");
  const doc = parseDocument(raw);
  updater(doc);
  const output = doc.toString({
    lineWidth: 0,
  });
  fs.writeFileSync(filePath, output, "utf8");
}

function upsertPaymentLinkUrl({
  filePath,
  variant,
  url,
}: {
  filePath: string;
  variant: "live" | "test" | "ghl";
  url: string;
}) {
  updateYamlFile(filePath, (doc) => {
    const existingNode = doc.get("payment_link");
    let paymentLinkMap: YAMLMap;

    if (isMap(existingNode)) {
      paymentLinkMap = existingNode;
    } else {
      paymentLinkMap = new YAMLMap();
      doc.set("payment_link", paymentLinkMap);
    }

    const key = `${variant}_url`;
    paymentLinkMap.set(key, url);
  });
}

function upsertStripeTestIdentifiers({
  filePath,
  testPriceId,
  testProductId,
}: {
  filePath: string;
  testPriceId: string;
  testProductId: string;
}) {
  updateYamlFile(filePath, (doc) => {
    const stripeNode = doc.get("stripe");
    let stripeMap: YAMLMap;

    if (isMap(stripeNode)) {
      stripeMap = stripeNode;
    } else {
      stripeMap = new YAMLMap();
      doc.set("stripe", stripeMap);
    }

    stripeMap.set("test_price_id", testPriceId);

    const metadataNode = stripeMap.get("metadata");
    let metadataMap: YAMLMap;

    if (isMap(metadataNode)) {
      metadataMap = metadataNode;
    } else {
      metadataMap = new YAMLMap();
      stripeMap.set("metadata", metadataMap);
    }

    metadataMap.set("test_stripe_product_id", testProductId);
  });
}

function resolveStripeSecret(mode: StripeMode): string | undefined {
  if (mode === "live") {
    const liveCandidates = [
      process.env.STRIPE_SECRET_KEY_LIVE,
      process.env.STRIPE_SECRET_KEY,
    ];

    for (const candidate of liveCandidates) {
      if (candidate && candidate.startsWith("sk_live_")) {
        return candidate;
      }
    }
    return undefined;
  }

  const testCandidates = [
    process.env.STRIPE_SECRET_KEY_TEST,
    process.env.STRIPE_TEST_SECRET_KEY,
    process.env.STRIPE_SECRET_KEY,
  ];

  for (const candidate of testCandidates) {
    if (candidate && candidate.startsWith("sk_test_")) {
      return candidate;
    }
  }

  return undefined;
}

function loadStripeClient(mode: StripeMode): Stripe | null {
  const secret = resolveStripeSecret(mode);
  if (!secret) {
    return null;
  }
  return new Stripe(secret, { apiVersion: API_VERSION });
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function coerceString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function getPrimaryTag(tags: unknown): string | null {
  if (!Array.isArray(tags)) {
    return null;
  }

  for (const tag of tags) {
    if (typeof tag === "string" && tag.trim().length > 0) {
      return tag.trim();
    }
  }

  return null;
}

function derivePricingInfo(data: ProductYaml): PriceInfo | null {
  const priceValue = coerceString(data.pricing?.price);
  if (!priceValue) {
    return null;
  }

  const numeric = priceValue.replace(/[^0-9.]/g, "");
  if (numeric.length === 0) {
    return null;
  }

  const parsed = Number.parseFloat(numeric);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const unitAmount = Math.round(parsed * 100);
  if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
    return null;
  }

  let currency = "usd";
  const rawCurrency = data.pricing?.currency;
  if (typeof rawCurrency === "string" && rawCurrency.trim().length > 0) {
    currency = rawCurrency.trim().toLowerCase();
  }

  return { unitAmount, currency };
}

function loadProducts(): ProductRecord[] {
  if (!fs.existsSync(PRODUCTS_DIR)) {
    throw new Error(`Products directory not found at ${PRODUCTS_DIR}`);
  }

  const files = fs
    .readdirSync(PRODUCTS_DIR)
    .filter((file) => file.toLowerCase().endsWith(".yaml"))
    .sort();

  const products: ProductRecord[] = [];

  for (const file of files) {
    const absolutePath = path.join(PRODUCTS_DIR, file);
    const raw = fs.readFileSync(absolutePath, "utf8");
    const data = parse(raw) as ProductYaml;

    const slug =
      coerceString(data.slug) ??
      file.replace(/\.ya?ml$/i, "").trim().toLowerCase();
    const name = coerceString(data.name) ?? slug;
    const livePriceId = coerceString(data.stripe?.price_id);
    const testPriceId = coerceString(data.stripe?.test_price_id);
    const stripeProductId = coerceString(
      data.stripe?.metadata?.stripe_product_id,
    );
    const stripeTestProductId = coerceString(
      data.stripe?.metadata?.test_stripe_product_id,
    );
    const ghlTag = getPrimaryTag(data.ghl?.tag_ids);
    const paymentLinkData = data.payment_link ?? null;
    const paymentLinkLiveUrl =
      typeof paymentLinkData?.live_url === "string" && paymentLinkData.live_url.trim().length > 0
        ? paymentLinkData.live_url.trim()
        : null;
    const paymentLinkTestUrl =
      typeof paymentLinkData?.test_url === "string" && paymentLinkData.test_url.trim().length > 0
        ? paymentLinkData.test_url.trim()
        : null;
    const paymentLinkGhlUrl =
      typeof paymentLinkData?.ghl_url === "string" && paymentLinkData.ghl_url.trim().length > 0
        ? paymentLinkData.ghl_url.trim()
        : null;
    const pricing = derivePricingInfo(data);

    products.push({
      slug,
      name,
      livePriceId,
      testPriceId,
      stripeProductId,
      stripeTestProductId,
      ghlTag,
      paymentLinkLiveUrl,
      paymentLinkTestUrl,
      paymentLinkGhlUrl,
      productPath: absolutePath,
      pricing,
    });
  }

  return products;
}

async function ensureTestPrice({
  stripe,
  record,
}: {
  stripe: Stripe;
  record: ProductRecord;
}): Promise<{ priceId: string; productId: string } | null> {
  if (!record.pricing) {
    console.warn(`⚠️  Skipping ${record.slug}: unable to derive pricing information for test price creation.`);
    return null;
  }

  let productId = record.stripeTestProductId;
  if (productId) {
    try {
      await stripe.products.retrieve(productId);
    } catch (error) {
      const stripeError = error as Stripe.errors.StripeError;
      console.warn(
        `⚠️  ${record.slug}: stored test product ${productId} is invalid (${stripeError?.message ?? "unknown error"}). Recreating.`
      );
      productId = null;
    }
  }

  if (!productId) {
    const createdProduct = await stripe.products.create({
      name: record.name,
      metadata: {
        source: "store-scripts/create-stripe-payment-links",
        product_slug: record.slug,
        environment: "test",
      },
    });
    productId = createdProduct.id;
    record.stripeTestProductId = productId;
  }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: record.pricing.unitAmount,
    currency: record.pricing.currency,
    nickname: `${record.name} (Test)`,
    metadata: {
      source: "store-scripts/create-stripe-payment-links",
      product_slug: record.slug,
      environment: "test",
    },
  });

  upsertStripeTestIdentifiers({
    filePath: record.productPath,
    testPriceId: price.id,
    testProductId: productId,
  });

  record.testPriceId = price.id;
  record.stripeTestProductId = productId;

  return { priceId: price.id, productId };
}

function ensureStripeClient(stripe: Stripe | null, mode: StripeMode): Stripe {
  if (!stripe) {
    throw new Error(
      `Missing Stripe ${mode} secret key. Provide STRIPE_SECRET_KEY_LIVE or STRIPE_SECRET_KEY (sk_live_...).`,
    );
  }
  return stripe;
}

function buildMetadata({
  slug,
  ghlTag,
  stripeProductId,
}: {
  slug: string;
  ghlTag: string | null;
  stripeProductId: string | null;
}): Record<string, string> {
  const metadata: Record<string, string> = {
    product_slug: slug,
    source: "store-scripts/create-stripe-payment-links",
  };

  if (ghlTag) {
    metadata.ghl_tag = ghlTag;
  }

  if (stripeProductId) {
    metadata.stripe_product_id = stripeProductId;
  }

  return metadata;
}

function buildSuccessRedirectUrl({
  slug,
  paymentLinkId,
  mode,
}: {
  slug: string;
  paymentLinkId: string;
  mode: StripeMode;
}): string {
  const trimmedBase = SUCCESS_REDIRECT_BASE.replace(/\/$/, "");
  const url = new URL(trimmedBase);
  url.searchParams.set("provider", "stripe");
  url.searchParams.set("slug", slug);
  url.searchParams.set("payment_link_id", paymentLinkId);
  url.searchParams.set("mode", mode);

  const serialized = url.toString();
  const separator = serialized.includes("?") ? "&" : "?";
  return `${serialized}${separator}session_id={CHECKOUT_SESSION_ID}`;
}

function buildPaymentLinkUpdatePayload({
  slug,
  ghlTag,
  stripeProductId,
  paymentLinkId,
  mode,
}: {
  slug: string;
  ghlTag: string | null;
  stripeProductId: string | null;
  paymentLinkId: string;
  mode: StripeMode;
}): Stripe.PaymentLinkUpdateParams {
  const metadata = buildMetadata({ slug, ghlTag, stripeProductId });
  const successUrl = buildSuccessRedirectUrl({
    slug,
    paymentLinkId,
    mode,
  });

  metadata.payment_link_mode = mode;

  const payload: Stripe.PaymentLinkUpdateParams = {
    active: true,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    automatic_tax: { enabled: false },
    tax_id_collection: { enabled: false },
    customer_creation: "if_required",
    invoice_creation: { enabled: false },
    after_completion: {
      type: "redirect",
      redirect: {
        url: successUrl,
      },
    },
    metadata,
    payment_intent_data: {
      metadata,
    },
  };

  (
    payload as Stripe.PaymentLinkUpdateParams & {
      phone_number_collection?: { enabled: boolean };
    }
  ).phone_number_collection = { enabled: false };

  (
    payload as Stripe.PaymentLinkUpdateParams & {
      consent_collection?: { terms_of_service?: "required" | "not_required" | null };
    }
  ).consent_collection = { terms_of_service: "required" };

  return payload;
}

async function createPaymentLinkWithRetry(
  stripe: Stripe,
  params: Stripe.PaymentLinkCreateParams,
  slug: string,
  attempt = 1,
): Promise<Stripe.PaymentLink> {
  try {
    return await stripe.paymentLinks.create(params);
  } catch (error) {
    const stripeError = error as Stripe.errors.StripeError;

    if (
      stripeError?.code === "rate_limit" ||
      stripeError?.code === "lock_timeout"
    ) {
      const nextAttempt = attempt + 1;
      if (nextAttempt > 5) {
        throw error;
      }

      const delayMs = Math.min(1000 * nextAttempt, 5000);
      console.warn(
        `⚠️  ${slug}: rate limited (attempt ${attempt}). Retrying in ${delayMs}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return createPaymentLinkWithRetry(stripe, params, slug, nextAttempt);
    }

    throw error;
  }
}

function toMarkdownTable(entries: ResultEntry[]): string {
  const sorted = [...entries].sort((a, b) => a.slug.localeCompare(b.slug));

  const lines: string[] = [];
  lines.push("# Stripe Payment Links");
  lines.push("");
  lines.push(
    `Last generated: ${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}`,
  );
  lines.push("");
  lines.push(
    "| Product | Price ID | Link ID | URL | Mode | Status | GHL Tag | Stripe Product | Notes |",
  );
  lines.push(
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  );

  for (const entry of sorted) {
    const trimmedUrl = entry.url.trim();
    const safeUrl = trimmedUrl.replace(/^https?:\/\//, "");
    const note = entry.note ?? "";
    const displayUrl = trimmedUrl
      ? `https://${safeUrl}`
      : "";

    lines.push(
      `| \`${entry.slug}\` | \`${entry.priceId}\` | \`${entry.linkId ?? ""}\` | ${displayUrl} | ${entry.mode} | ${entry.status} | ${
        entry.ghlTag ? `\`${entry.ghlTag}\`` : ""
      } | ${
        entry.stripeProductId ? `\`${entry.stripeProductId}\`` : ""
      } | ${note} |`,
    );
  }

  lines.push("");
  lines.push(
    "_Note: Re-run this script after adding new products to Stripe to keep URLs in sync._",
  );
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const stripe = ensureStripeClient(loadStripeClient(MODE), MODE);
  const products = loadProducts();

  if (!products.length) {
    console.log("No Stripe-backed products found. Nothing to do.");
    return;
  }

  const results: ResultEntry[] = [];
  let createdCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const product of products) {
    const priceId =
      MODE === "live" ? product.livePriceId : product.testPriceId;
    const existingUrl =
      MODE === "live"
        ? product.paymentLinkLiveUrl
        : product.paymentLinkTestUrl;

    if (existingUrl) {
      skippedCount += 1;
      results.push({
        slug: product.slug,
        name: product.name,
        priceId: priceId ?? "<missing>",
        stripeProductId:
          MODE === "live"
            ? product.stripeProductId
            : product.stripeTestProductId,
        ghlTag: product.ghlTag,
        linkId: extractLinkId(existingUrl),
        url: existingUrl,
        mode: MODE,
        status: "skipped",
        note: "Payment link already present.",
      });
      continue;
    }

    let resolvedPriceId = priceId;

    if (MODE === "test" && !resolvedPriceId) {
      try {
        const ensured = await ensureTestPrice({ stripe, record: product });
        if (!ensured) {
          skippedCount += 1;
          results.push({
            slug: product.slug,
            name: product.name,
            priceId: "<missing>",
            stripeProductId: product.stripeTestProductId,
            ghlTag: product.ghlTag,
            linkId: null,
            url: "",
            mode: MODE,
            status: "skipped",
            note: "Unable to create test price.",
          });
          continue;
        }
        resolvedPriceId = ensured.priceId;
      } catch (creationError) {
        const stripeError = creationError as Stripe.errors.StripeError;
        errorCount += 1;
        const message =
          stripeError?.message ??
          (stripeError?.code
            ? `Stripe error: ${stripeError.code}`
            : String(creationError));
        console.error(
          `❌ Failed to create test price for ${product.slug}: ${message}`,
        );
        results.push({
          slug: product.slug,
          name: product.name,
          priceId: "<missing>",
          stripeProductId: product.stripeTestProductId,
          ghlTag: product.ghlTag,
          linkId: null,
          url: "",
          mode: MODE,
          status: "error",
          note: `Failed to create test price: ${message}`,
        });
        continue;
      }
    }

    if (!resolvedPriceId) {
      skippedCount += 1;
      results.push({
        slug: product.slug,
        name: product.name,
        priceId: "<missing>",
        stripeProductId:
          MODE === "live"
            ? product.stripeProductId
            : product.stripeTestProductId,
        ghlTag: product.ghlTag,
        linkId: null,
        url: "",
        mode: MODE,
        status: "skipped",
        note: "Missing price ID for payment link creation.",
      });
      continue;
    }

    let createdLink: Stripe.PaymentLink | null = null;

    try {
      const metadata = buildMetadata({
        slug: product.slug,
        ghlTag: product.ghlTag,
        stripeProductId:
          MODE === "live"
            ? product.stripeProductId
            : product.stripeTestProductId,
      });

      const params: Stripe.PaymentLinkCreateParams = {
        line_items: [{ price: resolvedPriceId, quantity: 1 }],
        allow_promotion_codes: true,
        metadata,
        payment_intent_data: {
          metadata,
        },
        billing_address_collection: "auto",
        automatic_tax: { enabled: false },
        tax_id_collection: { enabled: false },
        customer_creation: "if_required",
        invoice_creation: { enabled: false },
        consent_collection: {
          terms_of_service: "required",
        },
        after_completion: {
          type: "hosted_confirmation",
        },
      };
      (
        params as Stripe.PaymentLinkCreateParams & {
          phone_number_collection?: { enabled: boolean };
        }
      ).phone_number_collection = { enabled: false };

      createdLink = await createPaymentLinkWithRetry(
        stripe,
        params,
        product.slug,
      );
      upsertPaymentLinkUrl({
        filePath: product.productPath,
        variant: MODE,
        url: createdLink.url,
      });

      if (MODE === "test") {
        product.paymentLinkTestUrl = createdLink.url;
      } else {
        product.paymentLinkLiveUrl = createdLink.url;
      }

      let status: ResultEntry["status"] = "created";
      let note: string | undefined;

      try {
        const updatePayload = buildPaymentLinkUpdatePayload({
          slug: product.slug,
          ghlTag: product.ghlTag,
          stripeProductId:
            MODE === "live"
              ? product.stripeProductId
              : product.stripeTestProductId,
          paymentLinkId: createdLink.id,
          mode: MODE,
        });

        await stripe.paymentLinks.update(createdLink.id, updatePayload);
      } catch (configurationError) {
        const stripeError = configurationError as Stripe.errors.StripeError;
        const configurationMessage =
          stripeError?.message ??
          (stripeError?.code
            ? `Stripe error: ${stripeError.code}`
            : String(configurationError));

        status = "error";
        note = `Payment link created but configuration failed: ${configurationMessage}`;

        console.error(
          `❌ Failed to configure redirect for ${product.slug}: ${configurationMessage}`,
        );
      }

      if (status === "created") {
        createdCount += 1;
        console.log(
          `✅ Created ${MODE} payment link for ${product.slug}: ${createdLink.url}`,
        );
      } else {
        errorCount += 1;
      }

      results.push({
        slug: product.slug,
        name: product.name,
        priceId: resolvedPriceId,
        stripeProductId:
          MODE === "live"
            ? product.stripeProductId
            : product.stripeTestProductId,
        ghlTag: product.ghlTag,
        linkId: createdLink.id ?? extractLinkId(createdLink.url),
        url: createdLink.url,
        mode: MODE,
        status,
        note,
      });
    } catch (error) {
      const stripeError = error as Stripe.errors.StripeError;
      const message =
        stripeError?.message ??
        (stripeError?.code ? `Stripe error: ${stripeError.code}` : String(error));

      const isInactivePrice =
        typeof stripeError?.message === "string"
        && (
          stripeError.message.includes("deleted or archived prices")
          || stripeError.message.includes("inactive product")
        );

      if (isInactivePrice) {
        skippedCount += 1;
        console.warn(
          `⚠️  Skipping ${product.slug}: ${message}`,
        );
        results.push({
          slug: product.slug,
          name: product.name,
          priceId: resolvedPriceId,
          stripeProductId:
            MODE === "live"
              ? product.stripeProductId
              : product.stripeTestProductId,
          ghlTag: product.ghlTag,
          linkId: null,
          url: "",
          mode: MODE,
          status: "skipped",
          note: message,
        });
        continue;
      }

      errorCount += 1;
      console.error(
        `❌ Failed to create ${MODE} payment link for ${product.slug}: ${message}`,
      );
      results.push({
        slug: product.slug,
        name: product.name,
        priceId: resolvedPriceId,
        stripeProductId:
          MODE === "live"
            ? product.stripeProductId
            : product.stripeTestProductId,
        ghlTag: product.ghlTag,
        linkId: null,
        url: "",
        mode: MODE,
        status: "error",
        note: message,
      });
    }
  }

  if (results.length > 0) {
    const markdown = toMarkdownTable(results);
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.writeFileSync(LOG_PATH, markdown, "utf8");
  }

  console.log("");
  console.log(`Created: ${createdCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Log written to ${LOG_PATH}`);

  if (errorCount > 0) {
    process.exitCode = 1;
  }
}

function extractLinkId(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const trimmed = parsed.pathname.replace(/^\/+|\/+$/g, "");
    return trimmed || null;
  } catch {
    return null;
  }
}

main().catch((error) => {
  console.error("Unhandled error creating Stripe payment links.", error);
  process.exitCode = 1;
});
