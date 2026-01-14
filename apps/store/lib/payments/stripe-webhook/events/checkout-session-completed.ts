import type Stripe from "stripe";

import { findCheckoutSessionByStripeSessionId } from "@/lib/checkout";
import { getOfferConfig } from "@/lib/products/offer-config";
import {
  getAllProductSlugsIncludingExcluded,
  getProductData,
  getProductDataAllowExcluded,
} from "@/lib/products/product";
import { recordWebhookLog } from "@/lib/webhook-logs";
import logger from "@/lib/logger";
import { sendOpsAlert } from "@/lib/notifications/ops";
import { normalizeMetadata } from "@/lib/payments/stripe-webhook/metadata";
import { ensureMetadataCaseVariants, getMetadataString } from "@/lib/metadata/metadata-access";
import { processFulfilledOrder, type NormalizedOrder } from "@/lib/payments/order-fulfillment";
import { getStripeClient } from "@/lib/payments/stripe";
import type { SerpAuthEntitlementsGrantResult } from "@/lib/serp-auth/entitlements";

const OPS_ALERT_THRESHOLD = 3;
const BUNDLE_EXPAND_MODE_OPTIONAL_ITEMS_UNION = "optional_items_union";

type StripeModeInput = "auto" | "live" | "test";

function appendUniqueString(target: string[], value: unknown) {
  if (typeof value !== "string") {
    return;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return;
  }

  if (!target.includes(trimmed)) {
    target.push(trimmed);
  }
}

let stripeProductSlugMap: Map<string, string> | null = null;
const stripeProductSlugCollisionIds = new Set<string>();

function normalizeStripeProductId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith("prod_")) {
    return null;
  }

  return trimmed;
}

function normalizeStoreProductUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(
    /^https:\/\/store\.serp\.co\/product-details\/product\//,
    "https://apps.serp.co/",
  );
  if (normalized !== value) {
    return normalized;
  }

  return value.replace(/^https:\/\/store\.serp\.co\//, "https://apps.serp.co/");
}

function collectStripeProductIds(metadata?: Record<string, unknown>): string[] {
  if (!metadata) {
    return [];
  }

  const candidates = [
    metadata["stripe_product_id"],
    metadata["stripeProductId"],
    metadata["stripe_test_product_id"],
    metadata["stripeTestProductId"],
  ];

  const ids: string[] = [];
  for (const candidate of candidates) {
    const normalized = normalizeStripeProductId(candidate);
    if (normalized) {
      ids.push(normalized);
    }
  }

  return ids;
}

function registerStripeProductId(map: Map<string, string>, productId: string, slug: string) {
  const existing = map.get(productId);
  if (!existing) {
    map.set(productId, slug);
    return;
  }

  if (existing !== slug && !stripeProductSlugCollisionIds.has(productId)) {
    stripeProductSlugCollisionIds.add(productId);
    logger.warn("stripe.product_slug_map_collision", {
      productId,
      slugs: [existing, slug],
    });
  }
}

function buildStripeProductSlugMap(): Map<string, string> {
  const map = new Map<string, string>();
  const slugs = getAllProductSlugsIncludingExcluded();

  for (const slug of slugs) {
    let product;
    try {
      product = getProductDataAllowExcluded(slug);
    } catch (error) {
      logger.warn("stripe.product_slug_map_product_load_failed", {
        slug,
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    const metadataSources = [
      product.payment?.stripe?.metadata as Record<string, unknown> | undefined,
    ];

    for (const source of metadataSources) {
      for (const productId of collectStripeProductIds(source)) {
        registerStripeProductId(map, productId, product.slug);
      }
    }
  }

  return map;
}

function resolveProductSlugFromStripeProductId(productId: string | null): string | null {
  if (!productId) {
    return null;
  }

  if (!stripeProductSlugMap) {
    stripeProductSlugMap = buildStripeProductSlugMap();
  }

  return stripeProductSlugMap.get(productId) ?? null;
}


function collectTagCandidatesFromMetadata(metadata: Record<string, unknown> | null | undefined): string[] {
  if (!metadata) {
    return [];
  }

  const candidates: string[] = [];
  appendUniqueString(candidates, metadata["ghl_tag"]);
  appendUniqueString(candidates, metadata["ghlTag"]);

  return candidates;
}

function collectSlugCandidatesFromMetadata(metadata: Record<string, unknown> | null | undefined): string[] {
  if (!metadata) {
    return [];
  }

  const candidates: string[] = [];
  appendUniqueString(candidates, metadata["product_slug"]);
  appendUniqueString(candidates, metadata["productSlug"]);
  appendUniqueString(candidates, metadata["slug"]);
  appendUniqueString(candidates, metadata["product_slug_id"]);
  return candidates;
}

function normalizeEntitlements(raw: unknown): string[] {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed ? [trimmed] : [];
  }
  if (!Array.isArray(raw)) {
    return [];
  }

  const entitlements: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (trimmed) {
      entitlements.push(trimmed);
    }
  }
  return entitlements;
}

function hasOptionalStripeItemProductId(product: unknown, stripeProductId: string): boolean {
  if (!product || typeof product !== "object") {
    return false;
  }

  const record = product as Record<string, unknown>;
  const payment = record.payment as Record<string, unknown> | undefined;
  const paymentStripe = (payment?.stripe as Record<string, unknown> | undefined) ?? undefined;
  const optionalItems =
    (paymentStripe?.optional_items as unknown) ??
    (paymentStripe?.optionalItems as unknown);

  if (!Array.isArray(optionalItems)) {
    return false;
  }

  return optionalItems.some((item) => {
    if (!item || typeof item !== "object") return false;
    const entry = item as Record<string, unknown>;
    return entry.product_id === stripeProductId || entry.productId === stripeProductId;
  });
}

type BundleIndex = {
  productIdToSlug: Map<string, string>;
  slugToProductIds: Map<string, string[]>;
};

let bundleIndexCache: BundleIndex | null = null;
const bundleEntitlementsCacheBySlug = new Map<string, string[]>();

function getBundleExpandMode(product: unknown): string | null {
  if (!product || typeof product !== "object") return null;
  const record = product as Record<string, unknown>;
  const checkoutMetadata = record.checkout_metadata as Record<string, unknown> | undefined;
  if (!checkoutMetadata || typeof checkoutMetadata !== "object") return null;

  const raw =
    checkoutMetadata.bundle_expand ??
    checkoutMetadata.bundleExpand ??
    checkoutMetadata.bundle_expand_mode ??
    checkoutMetadata.bundleExpandMode ??
    null;

  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function registerBundleProductId(map: Map<string, string>, productId: string, slug: string) {
  const existing = map.get(productId);
  if (!existing) {
    map.set(productId, slug);
    return;
  }

  if (existing !== slug) {
    logger.warn("stripe.bundle_product_id_collision", {
      productId,
      slugs: [existing, slug],
    });
  }
}

function buildBundleIndex(): BundleIndex {
  const productIdToSlug = new Map<string, string>();
  const slugToProductIds = new Map<string, string[]>();
  const slugs = getAllProductSlugsIncludingExcluded();

  for (const slug of slugs) {
    let product;
    try {
      product = getProductDataAllowExcluded(slug);
    } catch {
      continue;
    }

    const expandMode = getBundleExpandMode(product);
    if (expandMode !== BUNDLE_EXPAND_MODE_OPTIONAL_ITEMS_UNION) {
      continue;
    }

    const metadataSources = [
      product.payment?.stripe?.metadata as Record<string, unknown> | undefined,
    ];

    const ids = new Set<string>();
    for (const source of metadataSources) {
      for (const productId of collectStripeProductIds(source)) {
        ids.add(productId);
        registerBundleProductId(productIdToSlug, productId, product.slug);
      }
    }

    const uniqueIds = Array.from(ids);
    if (uniqueIds.length === 0) {
      logger.warn("stripe.bundle_product_missing_stripe_product_id", {
        slug: product.slug,
        expandMode,
      });
      continue;
    }
    slugToProductIds.set(product.slug, uniqueIds);
  }

  return { productIdToSlug, slugToProductIds };
}

function getBundleIndex(): BundleIndex {
  if (!bundleIndexCache) {
    bundleIndexCache = buildBundleIndex();
  }
  return bundleIndexCache;
}

function getBundleUnionEntitlementsForSlug(bundleSlug: string): string[] {
  const cached = bundleEntitlementsCacheBySlug.get(bundleSlug);
  if (cached) return cached;

  const bundleProductIds = getBundleIndex().slugToProductIds.get(bundleSlug) ?? [];
  if (bundleProductIds.length === 0) {
    bundleEntitlementsCacheBySlug.set(bundleSlug, []);
    return [];
  }

  const entitlements = new Set<string>();
  const slugs = getAllProductSlugsIncludingExcluded();

  for (const slug of slugs) {
    if (!slug || slug === bundleSlug) continue;

    let product;
    try {
      product = getProductDataAllowExcluded(slug);
    } catch {
      continue;
    }

    const offersBundle = bundleProductIds.some((productId) => hasOptionalStripeItemProductId(product, productId));
    if (!offersBundle) continue;

    const license = (product as Record<string, unknown>).license as Record<string, unknown> | undefined;
    const resolved = normalizeEntitlements(license?.entitlements);
    for (const entitlement of resolved) {
      entitlements.add(entitlement);
    }
  }

  const resolved = Array.from(entitlements).sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
  bundleEntitlementsCacheBySlug.set(bundleSlug, resolved);
  if (resolved.length === 0) {
    logger.warn("stripe.bundle_union_entitlements_empty", {
      bundleSlug,
      bundleProductIds,
    });
  }
  return resolved;
}

function collectEntitlementsForSlugs(slugs: string[]): {
  entitlements: string[];
  missingSlugs: string[];
  emptyEntitlementSlugs: string[];
} {
  const entitlements = new Set<string>();
  const missingSlugs: string[] = [];
  const emptyEntitlementSlugs: string[] = [];

  for (const slug of slugs) {
    if (!slug) continue;

    try {
      const product = (() => {
        try {
          return getProductData(slug);
        } catch {
          return getProductDataAllowExcluded(slug);
        }
      })();

      const expandMode = getBundleExpandMode(product);
      if (expandMode === BUNDLE_EXPAND_MODE_OPTIONAL_ITEMS_UNION) {
        for (const entitlement of getBundleUnionEntitlementsForSlug(slug)) {
          entitlements.add(entitlement);
        }
      }

      const resolved = normalizeEntitlements(product?.license?.entitlements);
      if (resolved.length === 0) {
        emptyEntitlementSlugs.push(slug);
        continue;
      }
      for (const entitlement of resolved) {
        entitlements.add(entitlement);
      }
    } catch {
      missingSlugs.push(slug);
    }
  }

  return {
    entitlements: Array.from(entitlements),
    missingSlugs,
    emptyEntitlementSlugs,
  };
}

async function collectLineItemTagData(
  session: Stripe.Checkout.Session,
  stripeMode: StripeModeInput,
  options?: { primaryPriceId?: string | null; accountAlias?: string | null },
): Promise<{
  tagIds: string[];
  productSlugs: string[];
  lineItems: Array<{ priceId: string | null; productId: string | null; quantity: number }>;
}> {
  const tagIds: string[] = [];
  const productSlugs: string[] = [];
  const resolvedLineItems: Array<{ priceId: string | null; productId: string | null; quantity: number }> = [];

  if (!session.id) {
    return { tagIds, productSlugs, lineItems: resolvedLineItems };
  }

  try {
    const stripe = getStripeClient({ mode: stripeMode, accountAlias: options?.accountAlias ?? undefined });
    const lineItemsResponse = await stripe.checkout.sessions.listLineItems(session.id, {
      expand: ["data.price.product"],
      limit: 100,
    });

    const deferredZeroQuantity: Stripe.LineItem[] = [];

    for (const item of lineItemsResponse.data ?? []) {
      const quantity = typeof item.quantity === "number" ? item.quantity : 1;

      const price = item.price ?? null;
      const priceId = price?.id ?? null;
      const productId = typeof price?.product === "string"
        ? price.product
        : price?.product && typeof price.product === "object" && "id" in price.product
        ? (price.product as Stripe.Product).id
        : null;

      resolvedLineItems.push({ priceId, productId, quantity });

      if (quantity <= 0) {
        deferredZeroQuantity.push(item);
        continue;
      }

      const slugFromProductId = resolveProductSlugFromStripeProductId(productId);
      if (slugFromProductId) {
        appendUniqueString(productSlugs, slugFromProductId);
      }

      if (price?.metadata) {
        for (const tag of collectTagCandidatesFromMetadata(price.metadata)) {
          appendUniqueString(tagIds, tag);
        }

        for (const slug of collectSlugCandidatesFromMetadata(price.metadata)) {
          appendUniqueString(productSlugs, slug);
        }
      }

      const priceProduct = price?.product ?? null;
      if (priceProduct && typeof priceProduct === "object" && !("deleted" in priceProduct && priceProduct.deleted)) {
        const product = priceProduct as Stripe.Product;
        if (product.metadata) {
          for (const tag of collectTagCandidatesFromMetadata(product.metadata)) {
            appendUniqueString(tagIds, tag);
          }

          for (const slug of collectSlugCandidatesFromMetadata(product.metadata)) {
            appendUniqueString(productSlugs, slug);
          }
        }
      }

    }

    const primaryPriceId = options?.primaryPriceId ?? null;
    if (primaryPriceId && deferredZeroQuantity.length > 0) {
      for (const item of deferredZeroQuantity) {
        const price = (item as Stripe.LineItem).price ?? null;
        if (!price || price.id !== primaryPriceId) {
          continue;
        }

        const productId = typeof price.product === "string"
          ? price.product
          : price.product && typeof price.product === "object" && "id" in price.product
          ? (price.product as Stripe.Product).id
          : null;

        const slugFromProductId = resolveProductSlugFromStripeProductId(productId);
        if (slugFromProductId) {
          appendUniqueString(productSlugs, slugFromProductId);
        }

        if (price.metadata) {
          for (const tag of collectTagCandidatesFromMetadata(price.metadata)) {
            appendUniqueString(tagIds, tag);
          }

          for (const slug of collectSlugCandidatesFromMetadata(price.metadata)) {
            appendUniqueString(productSlugs, slug);
          }
        }

        const priceProduct = price.product ?? null;
        if (priceProduct && typeof priceProduct === "object" && !("deleted" in priceProduct && priceProduct.deleted)) {
          const product = priceProduct as Stripe.Product;
          if (product.metadata) {
            for (const tag of collectTagCandidatesFromMetadata(product.metadata)) {
              appendUniqueString(tagIds, tag);
            }

            for (const slug of collectSlugCandidatesFromMetadata(product.metadata)) {
              appendUniqueString(productSlugs, slug);
            }
          }
        }
      }
    }
  } catch (error) {
    logger.warn("stripe.checkout_line_items_fetch_failed", {
      sessionId: session.id,
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
  }

  return { tagIds, productSlugs, lineItems: resolvedLineItems };
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  eventMeta?: { id?: string; type?: string; created?: number },
  context?: { accountAlias?: string | null },
) {
  const metadata = ensureMetadataCaseVariants(normalizeMetadata(session.metadata), { mirror: "snake" });

  const coerceMetadataString = (value: unknown): string | null => {
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const ensureMetadataValues = (rawValue: string | null, ...keys: string[]) => {
    const value = coerceMetadataString(rawValue);
    if (!value) {
      return;
    }

    for (const key of keys) {
      if (coerceMetadataString(metadata[key])) {
        continue;
      }
      metadata[key] = value;
    }
  };

  let productNameValue =
    coerceMetadataString(metadata["product_name"]) ??
    coerceMetadataString(metadata["productName"]) ??
    null;
  ensureMetadataValues(productNameValue, "product_name");

  const checkoutMode =
    typeof session.livemode === "boolean"
      ? session.livemode ? "live" : "test"
      : metadata.payment_link_mode ?? metadata.paymentLinkMode ?? null;
  const providerMode = typeof session.livemode === "boolean" ? (session.livemode ? "live" : "test") : null;
  if (checkoutMode) {
    metadata.checkout_mode = checkoutMode;
    metadata.payment_link_mode = checkoutMode;
  }

  const stripeModeForLineItems: StripeModeInput =
    checkoutMode === "test"
      ? "test"
      : checkoutMode === "live"
      ? "live"
      : "auto";

  let productSlugValue = metadata.product_slug ?? metadata.productSlug ?? null;
  if (productSlugValue) {
    metadata.product_slug = productSlugValue;
  }

  let stripeProductIdValue =
    metadata.stripe_product_id ?? metadata.stripeProductId ?? null;
  if (stripeProductIdValue) {
    metadata.stripe_product_id = stripeProductIdValue;
  }

  const metadataTagCandidates: string[] = [];
  appendUniqueString(metadataTagCandidates, metadata.ghl_tag);


  const tosStatus = session.consent?.terms_of_service ?? null;
  if (tosStatus) {
    metadata.stripeTermsOfService = tosStatus;
    if (tosStatus === "accepted") {
      metadata.tosAccepted = "true";
    }
  }

  const tosRequirement = session.consent_collection?.terms_of_service ?? null;
  if (tosRequirement) {
    metadata.stripeTermsOfServiceRequirement = tosRequirement;
  }

  if (session.client_reference_id) {
    metadata.clientReferenceId = session.client_reference_id;
  }

  const offerId =
    getMetadataString(metadata, "offer_id")
      ?? getMetadataString(metadata, "product_slug")
      ?? session.client_reference_id
      ?? (process.env.NODE_ENV === "development" ? "loom-video-downloader" : null);

  if (!offerId) {
    logger.error("webhook.missing_offer_id", {
      sessionId: session.id,
      metadata,
      clientReferenceId: session.client_reference_id,
    });
    return;
  }

  const landerId = getMetadataString(metadata, "lander_id") ?? metadata.product_slug ?? offerId;

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const customerEmail = session.customer_details?.email ?? session.customer_email ?? null;
  const customerPhone = session.customer_details?.phone ?? null;
  const offerConfig = getOfferConfig(offerId);

  if (!productNameValue) {
    const fallbackProductName = coerceMetadataString(offerConfig?.productName);
    if (fallbackProductName) {
      productNameValue = fallbackProductName;
      ensureMetadataValues(productNameValue, "product_name");
    }
  }

  ensureMetadataValues(productNameValue, "payment_description");

  if (!coerceMetadataString(metadata["description"]) && productNameValue) {
    metadata.description = productNameValue;
  }

  // Ensure Payment Intent has a human-friendly description in Stripe
  try {
    if (paymentIntentId && productNameValue) {
      const stripe = getStripeClient({
        mode: stripeModeForLineItems,
        accountAlias: context?.accountAlias ?? undefined,
      });
      const description = productNameValue;
      await stripe.paymentIntents.update(paymentIntentId, {
        description,
      });
      logger.info("stripe.payment_intent_description_updated", {
        paymentIntentId,
        description,
      });
    }
  } catch (error) {
    logger.warn("stripe.payment_intent_description_update_failed", {
      paymentIntentId,
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
  }

  // Receipt numbers are not available when the Checkout session is created; fetch them from the charge after payment.
  try {
    if (paymentIntentId) {
      const stripe = getStripeClient({
        mode: stripeModeForLineItems,
        accountAlias: context?.accountAlias ?? undefined,
      });
      const charges = await stripe.charges.list({ payment_intent: paymentIntentId, limit: 1 });
      const receiptNumber = charges.data?.[0]?.receipt_number ?? null;
      if (receiptNumber) {
        metadata.receipt_number = receiptNumber;
      }
    }
  } catch (error) {
    logger.warn("stripe.receipt_number_fetch_failed", {
      paymentIntentId,
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
  }

  if (!metadata.product_slug) {
    metadata.product_slug = offerId;
  }

  const primaryPriceIdForTags = getMetadataString(metadata, "stripe_price_id") ?? getMetadataString(metadata, "stripePriceId");
  const lineItemTagData = await collectLineItemTagData(session, stripeModeForLineItems, {
    primaryPriceId: primaryPriceIdForTags,
    accountAlias: context?.accountAlias ?? null,
  });
  const lineItemTags: string[] = [];
  const appendLineItemTag = (value: unknown) => appendUniqueString(lineItemTags, value);

  for (const entry of lineItemTagData.tagIds) {
    appendLineItemTag(entry);
  }

  const productSlugCandidatesFromLineItems: string[] = [];
  const appendLineItemProductSlug = (value: unknown) => appendUniqueString(productSlugCandidatesFromLineItems, value);

  for (const slug of lineItemTagData.productSlugs) {
    appendLineItemProductSlug(slug);
  }

  const bundles = getBundleIndex();
  for (const item of lineItemTagData.lineItems) {
    const productId = item.productId;
    if (!productId || item.quantity <= 0) continue;
    const bundleSlug = bundles.productIdToSlug.get(productId);
    if (bundleSlug) {
      appendLineItemProductSlug(bundleSlug);
    }
  }

  const appendProductTags = (slugs: string[], target: string[]) => {
    for (const slug of slugs) {
      if (!slug) continue;
      try {
        const product = getProductData(slug);
        const productTags = Array.isArray(product?.ghl?.tag_ids) ? product.ghl.tag_ids : [];
        for (const tag of productTags) {
          appendUniqueString(target, tag);
        }
      } catch (error) {
        logger.debug("product.lookup_failed_for_ghl_tags", {
          slug,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  };

  appendProductTags(productSlugCandidatesFromLineItems, lineItemTags);

  const fallbackTags: string[] = [];
  const appendFallbackTag = (value: unknown) => appendUniqueString(fallbackTags, value);

  for (const tag of metadataTagCandidates) {
    appendFallbackTag(tag);
  }

  if (offerConfig?.ghl?.tagIds) {
    for (const entry of offerConfig.ghl.tagIds) {
      appendFallbackTag(entry);
    }
  }

  const fallbackProductSlugCandidates: string[] = [];
  const appendFallbackProductSlug = (value: unknown) => appendUniqueString(fallbackProductSlugCandidates, value);

  appendFallbackProductSlug(productSlugValue);
  appendFallbackProductSlug(metadata.product_slug);
  appendFallbackProductSlug(offerId);

  const resolvedGhlTagIds: string[] = [];
  const appendResolvedTag = (value: unknown) => appendUniqueString(resolvedGhlTagIds, value);

  for (const tag of lineItemTags) {
    appendResolvedTag(tag);
  }

  if (resolvedGhlTagIds.length === 0) {
    appendProductTags(fallbackProductSlugCandidates, fallbackTags);
    for (const tag of fallbackTags) {
      appendResolvedTag(tag);
    }
  }

  const primaryGhlTag = resolvedGhlTagIds[0] ?? null;
  if (primaryGhlTag) {
    metadata.ghl_tag = primaryGhlTag;
  }

  logger.debug("stripe.checkout_resolved_tags", {
    sessionId: session.id,
    lineItemTagCount: lineItemTags.length,
    fallbackTagCount: fallbackTags.length,
    resolvedTagCount: resolvedGhlTagIds.length,
    resolvedTags: resolvedGhlTagIds,
    fallbackProductSlugCandidates,
    lineItemProductSlugs: productSlugCandidatesFromLineItems,
  });

  const entitlementSlugCandidates = Array.from(new Set([offerId, ...productSlugCandidatesFromLineItems]));
  const entitlementLookup = collectEntitlementsForSlugs(entitlementSlugCandidates);
  const resolvedLicenseEntitlements = entitlementLookup.entitlements;

  if (resolvedLicenseEntitlements.length > 0) {
    metadata.license_entitlements_resolved = resolvedLicenseEntitlements.join(",");
    metadata.license_entitlements_resolved_count = String(resolvedLicenseEntitlements.length);
  }

  if (entitlementLookup.missingSlugs.length > 0) {
    logger.warn("stripe.checkout_entitlements_missing", {
      sessionId: session.id,
      offerId,
      missingSlugs: entitlementLookup.missingSlugs,
    });
  }

  if (entitlementLookup.emptyEntitlementSlugs.length > 0) {
    logger.warn("stripe.checkout_entitlements_empty", {
      sessionId: session.id,
      offerId,
      emptyEntitlementSlugs: entitlementLookup.emptyEntitlementSlugs,
    });
  }

  logger.info("stripe.checkout_entitlements_resolved", {
    sessionId: session.id,
    offerId,
    entitlementSlugCandidates,
    entitlementsCount: resolvedLicenseEntitlements.length,
    entitlements: resolvedLicenseEntitlements,
  });

  if (paymentIntentId) {
    const webhookMetadata = {
      ...metadata,
      resolvedTagCount: resolvedGhlTagIds.length,
      resolvedTags: resolvedGhlTagIds,
    };

    await recordWebhookLog({
      paymentIntentId,
      stripeSessionId: session.id,
      eventType: "checkout.session.completed",
      offerId,
      landerId,
      status: "pending",
      metadata: webhookMetadata,
    });
  }

  const amountFormatted =
    typeof session.amount_total === "number" && session.currency
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: session.currency.toUpperCase(),
        }).format(session.amount_total / 100)
      : null;

  const existingSessionRecord = await findCheckoutSessionByStripeSessionId(session.id);
  const existingMetadata = (existingSessionRecord?.metadata ?? {}) as Record<string, unknown>;
  const ghlSyncedAtValue =
    typeof existingMetadata["ghlSyncedAt"] === "string" ? (existingMetadata["ghlSyncedAt"] as string) : undefined;
  const alreadySynced = Boolean(ghlSyncedAtValue);

  const offerMetadata = (offerConfig?.metadata ?? {}) as Record<string, unknown>;

  const legacyAppsUrl =
    getMetadataString(offerMetadata, "apps_serp_co_product_page_url")
      ?? getMetadataString(metadata, "apps_serp_co_product_page_url")
      ?? null;
  const legacyStoreUrl =
    getMetadataString(offerMetadata, "store_serp_co_product_page_url")
      ?? getMetadataString(metadata, "store_serp_co_product_page_url")
      ?? null;

  const appsProductPageUrl = normalizeStoreProductUrl(legacyAppsUrl);
  const storeProductPageUrl = normalizeStoreProductUrl(legacyStoreUrl);

  const productPageUrl = normalizeStoreProductUrl(
    getMetadataString(offerMetadata, "product_page_url")
      ?? getMetadataString(metadata, "product_page_url")
      ?? legacyAppsUrl
      ?? legacyStoreUrl,
  );

  const purchaseUrl =
    getMetadataString(metadata, "purchase_url")
      ?? getMetadataString(metadata, "serply_link")
      ?? getMetadataString(metadata, "checkout_url")
      ?? getMetadataString(offerMetadata, "purchase_url")
      ?? getMetadataString(offerMetadata, "serply_link")
      ?? null;

  const serplyLink =
    getMetadataString(metadata, "serply_link")
      ?? purchaseUrl
      ?? getMetadataString(offerMetadata, "serply_link")
      ?? null;

  const successUrl =
    getMetadataString(metadata, "success_url")
      ?? getMetadataString(offerMetadata, "success_url")
      ?? offerConfig?.successUrl
      ?? null;

  const cancelUrl =
    getMetadataString(metadata, "cancel_url")
      ?? getMetadataString(offerMetadata, "cancel_url")
      ?? offerConfig?.cancelUrl
      ?? null;

  const providerAccountAlias =
    context?.accountAlias
      ?? getMetadataString(metadata, "payment_provider_account")
      ?? getMetadataString(metadata, "payment_provider_account_alias")
      ?? null;

  const normalizedOrder: NormalizedOrder = {
    provider: "stripe",
    providerAccountAlias,
    providerMode,
    providerSessionId: session.id ?? null,
    providerPaymentId: paymentIntentId ?? null,
    sessionId: session.id,
    paymentIntentId,
    offerId,
    landerId,
    productSlug: getMetadataString(metadata, "product_slug") ?? offerId,
    productName: getMetadataString(metadata, "product_name") ?? offerConfig?.productName ?? offerId,
    customerEmail: customerEmail ?? null,
    customerName: session.customer_details?.name ?? null,
    customerPhone,
    clientReferenceId: session.client_reference_id ?? null,
    metadata,
    amountTotal: session.amount_total ?? null,
    amountFormatted: amountFormatted ?? undefined,
    currency: session.currency ?? null,
    paymentStatus: session.payment_status ?? null,
    paymentMethod: session.payment_method_types?.[0] ?? null,
    resolvedGhlTagIds,
    urls: {
      productPageUrl: productPageUrl ?? undefined,
      purchaseUrl: purchaseUrl ?? undefined,
      storeProductPageUrl: storeProductPageUrl ?? undefined,
      appsProductPageUrl: appsProductPageUrl ?? undefined,
      serplyLink: serplyLink ?? undefined,
      successUrl: successUrl ?? undefined,
      cancelUrl: cancelUrl ?? undefined,
    },
    license: resolvedLicenseEntitlements.length > 0 ? { entitlements: resolvedLicenseEntitlements } : undefined,
    tosAccepted: metadata.tosAccepted === "true" ? true : metadata.tosAccepted === "false" ? false : null,
    skipSideEffects: alreadySynced,
  };

  const fulfillmentResult = await processFulfilledOrder(normalizedOrder);
  const licenseEntitlements =
    fulfillmentResult.licenseConfig.entitlements.length > 0 ? fulfillmentResult.licenseConfig.entitlements : null;

  // Best-effort SERP Auth entitlements grant (only for paid/no-payment-required sessions)
  let serpAuthEntitlementsGrant: SerpAuthEntitlementsGrantResult | null = null;
  try {
    const paymentStatus = session.payment_status ?? null;
    const isPaid = paymentStatus === "paid" || paymentStatus === "no_payment_required";
    const stripeCustomerId = typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;
    const stripeSubscriptionId = typeof session.subscription === "string"
      ? session.subscription
      : session.subscription && typeof session.subscription === "object" && "id" in session.subscription
      ? (session.subscription as Stripe.Subscription).id
      : null;

    if (!isPaid) {
      logger.info("serp_auth.entitlements_grant_skipped", {
        sessionId: session.id,
        paymentIntentId,
        paymentStatus,
      });
    } else if (!customerEmail) {
      logger.info("serp_auth.entitlements_grant_skipped", {
        sessionId: session.id,
        paymentIntentId,
        paymentStatus,
        reason: "missing_customer_email",
      });
    } else {
      const entitlementsToGrant = (licenseEntitlements && licenseEntitlements.length > 0)
        ? licenseEntitlements
        : (offerId ? [offerId] : []);

      if (entitlementsToGrant.length > 0) {
        const { grantSerpAuthEntitlements } = await import("@/lib/serp-auth/entitlements");
        serpAuthEntitlementsGrant = await grantSerpAuthEntitlements({
          email: customerEmail,
          entitlements: entitlementsToGrant,
          metadata: {
            source: "stripe",
            env: typeof session.livemode === "boolean"
              ? session.livemode
                ? "production"
                : "test"
              : process.env.NODE_ENV ?? "unknown",
            offerId,
            paymentStatus,
            stripe: {
              eventId: eventMeta?.id ?? null,
              eventType: eventMeta?.type ?? "checkout.session.completed",
              livemode: typeof session.livemode === "boolean" ? session.livemode : null,
              created: eventMeta?.created ?? null,
              checkoutSessionId: session.id ?? null,
              paymentIntentId,
              customerId: stripeCustomerId,
              subscriptionId: stripeSubscriptionId,
            },
            lineItems: lineItemTagData.lineItems,
          },
          context: {
            provider: "stripe",
            providerEventId: eventMeta?.id ?? null,
            providerSessionId: session.id ?? null,
          },
        });
      }
    }
  } catch (error) {
    logger.error("serp_auth.entitlements_grant_failed", {
      sessionId: session.id,
      paymentIntentId,
      error: error instanceof Error ? { message: error.message, name: error.name, stack: error.stack } : error,
    });
    serpAuthEntitlementsGrant = {
      status: "failed",
      httpStatus: null,
      error: error instanceof Error ? { message: error.message, name: error.name } : { message: String(error) },
    };
  }

  if (paymentIntentId && serpAuthEntitlementsGrant && serpAuthEntitlementsGrant.status !== "succeeded") {
    const shouldFailWebhook =
      serpAuthEntitlementsGrant.status === "failed" ||
      (serpAuthEntitlementsGrant.status === "skipped" && serpAuthEntitlementsGrant.reason === "missing_internal_secret");

    if (shouldFailWebhook) {
      const message =
        serpAuthEntitlementsGrant.status === "skipped"
          ? "SERP Auth entitlements grant skipped (missing internal secret)"
          : "SERP Auth entitlements grant failed";

      const logResult = await recordWebhookLog({
        paymentIntentId,
        stripeSessionId: session.id,
        eventType: "checkout.session.completed",
        offerId,
        landerId,
        status: "error",
        message,
        metadata: {
          serpAuthEntitlementsGrant,
        },
      });

      if (
        logResult?.status === "error" &&
        logResult.attempts === 1 &&
        serpAuthEntitlementsGrant.status === "failed"
      ) {
        await sendOpsAlert("SERP Auth entitlements grant failed", {
          offerId,
          landerId,
          paymentIntentId,
          stripeSessionId: session.id ?? null,
          httpStatus: serpAuthEntitlementsGrant.httpStatus ?? null,
          error: serpAuthEntitlementsGrant.error?.message ?? null,
        });
      }

      if (logResult?.status === "error" && logResult.attempts >= OPS_ALERT_THRESHOLD) {
        await sendOpsAlert("SERP Auth entitlements grant failing", {
          offerId,
          landerId,
          paymentIntentId,
          attempts: logResult.attempts,
          message,
        });
      }

      throw new Error(message);
    }
  }

  const baseSkipReason = !offerConfig?.ghl
    ? "missing_configuration"
    : alreadySynced
    ? "already_synced"
    : undefined;

  if (paymentIntentId) {
    if (fulfillmentResult.ghlResult.status === "error") {
      const message =
        fulfillmentResult.ghlResult.error?.message ?? "Failed to sync order with GHL";
      const logResult = await recordWebhookLog({
        paymentIntentId,
        stripeSessionId: session.id,
        eventType: "checkout.session.completed",
        offerId,
        landerId,
        status: "error",
        message,
        metadata: {
          errorName: fulfillmentResult.ghlResult.error instanceof Error ? fulfillmentResult.ghlResult.error.name : undefined,
          serpAuthEntitlementsGrant,
        },
      });

      if (logResult?.status === "error" && logResult.attempts >= OPS_ALERT_THRESHOLD) {
        await sendOpsAlert("GHL sync failed after multiple attempts", {
          offerId,
          landerId,
          paymentIntentId,
          attempts: logResult.attempts,
          message,
        });
      }
    } else {
      const outcomeMetadata: Record<string, unknown> = {
        contactId: fulfillmentResult.ghlResult.result?.contactId,
        opportunityCreated: fulfillmentResult.ghlResult.result?.opportunityCreated ?? false,
        outcome: fulfillmentResult.ghlResult.status,
      };
      const skipReason =
        fulfillmentResult.ghlResult.status === "skipped"
          ? baseSkipReason ?? "provider_skipped"
          : baseSkipReason;

      if (skipReason) {
        outcomeMetadata.skipReason = skipReason;
      }

      outcomeMetadata.serpAuthEntitlementsGrant = serpAuthEntitlementsGrant;

      await recordWebhookLog({
        paymentIntentId,
        stripeSessionId: session.id,
        eventType: "checkout.session.completed",
        offerId,
        landerId,
        status: "success",
        metadata: outcomeMetadata,
      });
    }
  }

  if (alreadySynced) {
    logger.debug("ghl.sync_already_completed", {
      offerId,
      stripeSessionId: session.id,
      ghlSyncedAt: existingMetadata.ghlSyncedAt,
    });
    return;
  }

  if (!offerConfig?.ghl) {
    logger.debug("ghl.sync_skipped", {
      offerId,
      reason: "missing_configuration",
    });
    return;
  }

  if (!customerEmail) {
    logger.error("ghl.sync_failed", {
      offerId,
      reason: "missing_customer_email",
      paymentIntentId,
    });
    return;
  }

  // Best-effort Stripe Entitlements grant (guarded by flag)
  try {
    const stripeCustomerId = typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;

    const featuresToGrant = (licenseEntitlements && licenseEntitlements.length > 0)
      ? licenseEntitlements
      : (offerId ? [offerId] : []);

    if (stripeCustomerId && featuresToGrant.length > 0) {
      const { ensureFeaturesExist, grantCustomerFeatures } = await import("@/lib/payments/stripe-entitlements");
      await ensureFeaturesExist(featuresToGrant);
      await grantCustomerFeatures(stripeCustomerId, featuresToGrant);
    }
  } catch (error) {
    logger.debug("stripe.entitlements_grant_skipped_or_failed", {
      sessionId: session.id,
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
  }
}
