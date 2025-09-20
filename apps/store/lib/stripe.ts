import Stripe from "stripe";

import logger from "@/lib/logger";

const apiVersion: Stripe.StripeConfig["apiVersion"] = "2024-04-10";

let stripeClientAuto: Stripe | undefined;
let stripeClientLive: Stripe | null | undefined;
let stripeClientTest: Stripe | null | undefined;

function createStripeClient(secret: string | undefined | null): Stripe | null {
  if (!secret) {
    return null;
  }

  return new Stripe(secret, { apiVersion });
}

function resolveStripeSecret(): string {
  const secret = process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_SECRET_KEY_TEST;
  if (!secret) {
    throw new Error("Stripe secret key is not configured. Set STRIPE_SECRET_KEY or STRIPE_SECRET_KEY_TEST.");
  }

  return secret;
}

export function getStripeClient(mode: "auto" | "live" | "test" = "auto"): Stripe {
  if (mode === "auto") {
    if (!stripeClientAuto) {
      stripeClientAuto = new Stripe(resolveStripeSecret(), { apiVersion });
    }

    return stripeClientAuto;
  }

  if (mode === "live") {
    if (stripeClientLive === undefined) {
      stripeClientLive = createStripeClient(process.env.STRIPE_SECRET_KEY);
    }

    if (!stripeClientLive) {
      throw new Error("Live Stripe key (STRIPE_SECRET_KEY) is not configured.");
    }

    return stripeClientLive;
  }

  if (stripeClientTest === undefined) {
    stripeClientTest = createStripeClient(process.env.STRIPE_SECRET_KEY_TEST ?? process.env.STRIPE_SECRET_KEY);
  }

  if (!stripeClientTest) {
    throw new Error("Test Stripe key is not configured. Set STRIPE_SECRET_KEY_TEST.");
  }

  return stripeClientTest;
}

export function isUsingTestKeys(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY_TEST && !process.env.STRIPE_SECRET_KEY);
}

function parseUnitAmount(price: Stripe.Price): number {
  if (typeof price.unit_amount === "number") {
    return price.unit_amount;
  }

  if (typeof price.unit_amount_decimal === "string") {
    const parsed = Number.parseInt(price.unit_amount_decimal, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  throw new Error(`Unable to determine amount for price ${price.id}`);
}

async function ensureTestPriceExists(offer: {
  id: string;
  priceId: string;
  productName?: string | null;
  productDescription?: string | null;
  productImage?: string | null;
}): Promise<Stripe.Price> {
  const testClient = getStripeClient("test");

  try {
    return await testClient.prices.retrieve(offer.priceId, { expand: ["product"] });
  } catch (error) {
    const stripeError = error as Stripe.errors.StripeError;
    const code = (stripeError as Stripe.errors.StripeInvalidRequestError)?.code;

    if (code !== "resource_missing") {
      throw error;
    }
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      `Stripe test price ${offer.priceId} is missing and STRIPE_SECRET_KEY is not configured for cloning. ` +
        `Add a test price or set STRIPE_SECRET_KEY alongside STRIPE_SECRET_KEY_TEST.`,
    );
  }

  const liveClient = getStripeClient("live");
  const livePrice = await liveClient.prices.retrieve(offer.priceId, { expand: ["product"] });

  const lookupKey = livePrice.lookup_key ?? `slug:${offer.id}`;

  if (lookupKey) {
    try {
      const existing = await testClient.prices.list({ lookup_keys: [lookupKey], limit: 1, active: true });
      if (existing.data[0]) {
        return await testClient.prices.retrieve(existing.data[0].id, { expand: ["product"] });
      }
    } catch (error) {
      logger.warn("stripe.lookup_price_failed", {
        slug: offer.id,
        lookupKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const amount = parseUnitAmount(livePrice);
  const currency = livePrice.currency ?? "usd";

const rawProduct = typeof livePrice.product === "string"
    ? await liveClient.products.retrieve(livePrice.product)
    : livePrice.product ?? null;

const isActiveProduct = (candidate: Stripe.Product | Stripe.DeletedProduct | null): candidate is Stripe.Product => {
    return Boolean(candidate && !candidate.deleted);
  };

const product = isActiveProduct(rawProduct) ? rawProduct : null;

  let testProductId: string | undefined;

  if (lookupKey) {
    try {
      const byLookup = await testClient.prices.list({ lookup_keys: [lookupKey], limit: 1 });
      if (byLookup.data[0]) {
        testProductId = byLookup.data[0].product as string;
      }
    } catch (error) {
      logger.debug("stripe.lookup_test_product_failed", {
        slug: offer.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!testProductId) {
    try {
      const search = await testClient.products.search({
        query: `metadata['slug']:'${offer.id}'`,
        limit: 1,
      });

      if (search.data[0]) {
        testProductId = search.data[0].id;
      }
    } catch (error) {
      logger.debug("stripe.test_product_search_failed", {
        slug: offer.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!testProductId) {
    const createPayload: Stripe.ProductCreateParams = {
      name: offer.productName ?? product?.name ?? offer.id,
      metadata: {
        slug: offer.id,
        cloned_from_product: product?.id ?? null,
      },
    };

    const description = offer.productDescription ?? product?.description ?? undefined;
    if (description) {
      createPayload.description = description;
    }

    const imageCandidates = [offer.productImage, ...(product?.images ?? [])].filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );

    if (imageCandidates.length > 0) {
      createPayload.images = Array.from(new Set(imageCandidates)).slice(0, 8);
    }

    const createdProduct = await testClient.products.create(createPayload);
    testProductId = createdProduct.id;
  }

  const priceParams: Stripe.PriceCreateParams = {
    product: testProductId,
    currency,
    unit_amount: amount,
    nickname: livePrice.nickname ?? offer.productName ?? offer.id,
    metadata: {
      slug: offer.id,
      cloned_from_price: livePrice.id,
    },
  };

  if (lookupKey) {
    priceParams.lookup_key = lookupKey;
    priceParams.transfer_lookup_key = true;
  }

  if (livePrice.recurring) {
    priceParams.recurring = {
      interval: livePrice.recurring.interval,
      interval_count: livePrice.recurring.interval_count ?? undefined,
      usage_type: livePrice.recurring.usage_type ?? undefined,
      aggregate_usage: livePrice.recurring.aggregate_usage ?? undefined,
      trial_period_days: livePrice.recurring.trial_period_days ?? undefined,
    };
  }

  if (livePrice.tax_behavior) {
    priceParams.tax_behavior = livePrice.tax_behavior;
  }

  if (livePrice.billing_scheme) {
    priceParams.billing_scheme = livePrice.billing_scheme;
  }

  const createdPrice = await testClient.prices.create(priceParams);

  logger.info("stripe.test_price_created", {
    slug: offer.id,
    testPriceId: createdPrice.id,
    lookupKey,
  });

  return await testClient.prices.retrieve(createdPrice.id, { expand: ["product"] });
}

export async function resolvePriceForEnvironment(offer: {
  id: string;
  priceId: string;
  productName?: string | null;
  productDescription?: string | null;
  productImage?: string | null;
}): Promise<Stripe.Price> {
  const client = getStripeClient();

  try {
    return await client.prices.retrieve(offer.priceId, { expand: ["product"] });
  } catch (error) {
    if (!isUsingTestKeys()) {
      throw error;
    }

    return ensureTestPriceExists(offer);
  }
}
