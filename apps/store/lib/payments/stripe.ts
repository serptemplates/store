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

type ProductCloneTarget = {
  name: string;
  description?: string;
  images?: string[];
  metadata: Record<string, string>;
  unit_label?: string;
  statement_descriptor?: string;
};

type ProductClonePayload = {
  target: ProductCloneTarget;
  create: Stripe.ProductCreateParams;
  update: Stripe.ProductUpdateParams;
};

type PriceCloneTarget = {
  metadata: Record<string, string>;
  nickname: string;
};

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

type ResolvePriceInput = {
  id: string;
  priceId: string;
  productName?: string | null;
  productDescription?: string | null;
  productImage?: string | null;
};

function sanitizeMetadata(metadata: Stripe.Metadata | null | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === "string") {
        result[key] = value;
      }
    }
  }
  return result;
}

function mergeMetadata(
  base: Stripe.Metadata | null | undefined,
  additions: Record<string, string | null | undefined>,
): Record<string, string> {
  const merged = sanitizeMetadata(base);
  for (const [key, value] of Object.entries(additions)) {
    if (typeof value === "string" && value.length > 0) {
      merged[key] = value;
    } else if (value === null) {
      delete merged[key];
    }
  }
  return merged;
}

function buildProductClonePayload({
  offer,
  product,
}: {
  offer: ResolvePriceInput;
  product: Stripe.Product | null;
}): ProductClonePayload {
  const targetName = product?.name ?? offer.productName ?? offer.id;
  const targetDescription = product?.description ?? offer.productDescription ?? undefined;

  const imageCandidates = [...(product?.images ?? []), offer.productImage].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );
  const targetImages = Array.from(new Set(imageCandidates)).slice(0, 8);

  const targetMetadata = mergeMetadata(product?.metadata, {
    slug: offer.id,
    cloned_from_product: product?.id ?? undefined,
  });

  const base: ProductCloneTarget = {
    name: targetName,
    metadata: targetMetadata,
  };

  if (targetDescription) {
    base.description = targetDescription;
  }
  if (targetImages.length > 0) {
    base.images = targetImages;
  }
  if (product?.unit_label) {
    base.unit_label = product.unit_label;
  }
  if (typeof product?.statement_descriptor === "string") {
    base.statement_descriptor = product.statement_descriptor;
  }
  const createPayload: Stripe.ProductCreateParams = {
    name: base.name,
    metadata: base.metadata,
  };
  if (base.description !== undefined) {
    createPayload.description = base.description;
  }
  if (base.images) {
    createPayload.images = base.images;
  }
  if (base.unit_label) {
    createPayload.unit_label = base.unit_label;
  }
  if (base.statement_descriptor) {
    createPayload.statement_descriptor = base.statement_descriptor;
  }

  const updatePayload: Stripe.ProductUpdateParams = {
    name: base.name,
    metadata: base.metadata,
  };
  if (base.description !== undefined) {
    updatePayload.description = base.description;
  } else {
    updatePayload.description = "";
  }
  if (base.images) {
    updatePayload.images = base.images;
  }
  if (base.unit_label) {
    updatePayload.unit_label = base.unit_label;
  } else {
    updatePayload.unit_label = "";
  }
  if (base.statement_descriptor) {
    updatePayload.statement_descriptor = base.statement_descriptor;
  }

  return {
    target: base,
    create: createPayload,
    update: updatePayload,
  };
}

function buildPriceMetadata(
  source: Stripe.Metadata | null | undefined,
  slug: string,
  clonedFromPriceId?: string,
): Record<string, string> {
  return mergeMetadata(source, {
    slug,
    cloned_from_price: clonedFromPriceId ?? undefined,
  });
}

function buildPriceClonePayload(
  offer: ResolvePriceInput,
  livePrice: Stripe.Price,
): { target: PriceCloneTarget; update: Stripe.PriceUpdateParams } {
  const targetMetadata = buildPriceMetadata(livePrice.metadata, offer.id, livePrice.id);
  const nickname = livePrice.nickname ?? offer.productName ?? offer.id;

  return {
    target: {
      metadata: targetMetadata,
      nickname,
    },
    update: {
      metadata: targetMetadata,
      nickname,
    },
  };
}

function isDeletedProduct(candidate: Stripe.Product | Stripe.DeletedProduct | null | undefined): candidate is Stripe.DeletedProduct {
  return Boolean(candidate && typeof (candidate as Stripe.DeletedProduct).deleted === "boolean" && (candidate as Stripe.DeletedProduct).deleted);
}

function productsEqual(a?: ProductCloneTarget, product?: Stripe.Product | Stripe.DeletedProduct | null): boolean {
  if (!a) {
    return true;
  }
  if (!product || isDeletedProduct(product)) {
    return false;
  }
  const normalized = product as Stripe.Product;
  const imagesA = a.images ?? [];
  const imagesB = normalized.images ?? [];
  const metadataEqual = JSON.stringify(normalized.metadata ?? {}) === JSON.stringify(a.metadata ?? {});

  return (
    normalized.name === a.name
    && (normalized.description ?? "") === (a.description ?? "")
    && JSON.stringify(imagesA) === JSON.stringify(imagesB)
    && metadataEqual
    && (normalized.unit_label ?? "") === (a.unit_label ?? "")
    && (normalized.statement_descriptor ?? undefined) === (a.statement_descriptor ?? undefined)
  );
}

function pricesEqual(target: PriceCloneTarget, price: Stripe.Price): boolean {
  const metadataEqual = JSON.stringify(price.metadata ?? {}) === JSON.stringify(target.metadata ?? {});
  return metadataEqual && (price.nickname ?? "") === (target.nickname ?? "");
}

async function resolveProductObject(
  value: string | Stripe.Product | Stripe.DeletedProduct | null | undefined,
  client: Stripe,
): Promise<Stripe.Product | null> {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    try {
      const candidate = await client.products.retrieve(value);
      return isDeletedProduct(candidate as Stripe.Product | Stripe.DeletedProduct) ? null : (candidate as Stripe.Product);
    } catch {
      return null;
    }
  }

  if (isDeletedProduct(value)) {
    return null;
  }

  return value as Stripe.Product;
}

async function ensureTestPriceExists(offer: ResolvePriceInput): Promise<Stripe.Price> {
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

  const targetProductFields = buildProductClonePayload({ offer, product });

  if (!testProductId) {
    const createdProduct = await testClient.products.create(targetProductFields.create);
    testProductId = createdProduct.id;
  } else {
    try {
      await testClient.products.update(testProductId, targetProductFields.update);
    } catch (error) {
      logger.warn("stripe.test_product_sync_failed", {
        slug: offer.id,
        productId: testProductId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const priceParams: Stripe.PriceCreateParams = {
    product: testProductId,
    currency,
    unit_amount: amount,
    nickname: livePrice.nickname ?? offer.productName ?? offer.id,
    metadata: buildPriceMetadata(livePrice.metadata, offer.id, livePrice.id),
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

async function syncTestPriceWithLive(offer: ResolvePriceInput, testPrice: Stripe.Price): Promise<Stripe.Price> {
  const liveKey = getOptionalStripeSecretKey("live");
  if (!liveKey) {
    return testPrice;
  }

  const testClient = getStripeClient("test");
  const liveClient = getStripeClient("live");

  let livePrice: Stripe.Price | null = null;
  try {
    livePrice = await liveClient.prices.retrieve(offer.priceId, { expand: ["product"] });
  } catch (error) {
    logger.warn("stripe.live_price_sync_failed", {
      slug: offer.id,
      priceId: offer.priceId,
      error: error instanceof Error ? error.message : String(error),
    });
    return testPrice;
  }

  const testProduct = await resolveProductObject(testPrice.product, testClient);
  const liveProduct = await resolveProductObject(livePrice.product, liveClient);

  const productPayload = buildProductClonePayload({ offer, product: liveProduct });
  let requiresRefetch = false;

  if (!productsEqual(productPayload.target, testProduct)) {
    try {
      if (testProduct?.id) {
        await testClient.products.update(testProduct.id, productPayload.update);
      }
      requiresRefetch = true;
    } catch (error) {
      logger.warn("stripe.test_product_update_failed", {
        slug: offer.id,
        productId: testProduct?.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const pricePayload = buildPriceClonePayload(offer, livePrice);
  if (!pricesEqual(pricePayload.target, testPrice)) {
    try {
      await testClient.prices.update(testPrice.id, pricePayload.update);
      requiresRefetch = true;
    } catch (error) {
      logger.warn("stripe.test_price_update_failed", {
        slug: offer.id,
        priceId: testPrice.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (requiresRefetch) {
    return await testClient.prices.retrieve(testPrice.id, { expand: ["product"] });
  }

  return testPrice;
}

export async function resolvePriceForEnvironment(
  offer: ResolvePriceInput,
  options?: { syncWithLiveProduct?: boolean },
): Promise<Stripe.Price> {
  const client = getStripeClient();

  try {
    const price = await client.prices.retrieve(offer.priceId, { expand: ["product"] });
    if (options?.syncWithLiveProduct && isUsingTestKeys()) {
      return await syncTestPriceWithLive(offer, price);
    }
    return price;
  } catch (error) {
    if (!isUsingTestKeys()) {
      throw error;
    }

    const clonedPrice = await ensureTestPriceExists(offer);
    if (options?.syncWithLiveProduct) {
      return await syncTestPriceWithLive(offer, clonedPrice);
    }
    return clonedPrice;
  }
}
