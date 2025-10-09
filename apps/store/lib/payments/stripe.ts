import Stripe from "stripe";

import logger from "@/lib/logger";
import {
  getOptionalStripeSecretKey,
  getStripeMode,
  isStripeTestMode,
  requireStripeSecretKey,
  type StripeMode,
} from "@/lib/payments/stripe-environment";

const apiVersion: Stripe.StripeConfig["apiVersion"] = "2024-04-10";

const clientCache: Partial<Record<StripeMode, Stripe>> = {};
let autoClientCache: { mode: StripeMode; client: Stripe } | null = null;

function getOrCreateClient(mode: StripeMode): Stripe {
  if (clientCache[mode]) {
    return clientCache[mode]!;
  }

  const client = new Stripe(requireStripeSecretKey(mode), { apiVersion });
  clientCache[mode] = client;
  return client;
}

export function getStripeClient(mode: "auto" | StripeMode = "auto"): Stripe {
  const resolvedMode = mode === "auto" ? getStripeMode() : mode;

  if (mode === "auto") {
    if (autoClientCache && autoClientCache.mode === resolvedMode) {
      return autoClientCache.client;
    }

    const client = getOrCreateClient(resolvedMode);
    autoClientCache = { mode: resolvedMode, client };
    return client;
  }

  return getOrCreateClient(resolvedMode);
}

export function isUsingTestKeys(): boolean {
  return isStripeTestMode();
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

  if (!getOptionalStripeSecretKey("live")) {
    throw new Error(
      `Stripe test price ${offer.priceId} is missing and no live Stripe secret key is configured for cloning. ` +
        `Add a test price or set STRIPE_SECRET_KEY_LIVE (or STRIPE_SECRET_KEY with an sk_live_* value) alongside STRIPE_SECRET_KEY_TEST.`,
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
