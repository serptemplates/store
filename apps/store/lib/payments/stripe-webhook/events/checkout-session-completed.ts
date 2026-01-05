import type Stripe from "stripe";

import { findCheckoutSessionByStripeSessionId } from "@/lib/checkout";
import { getOfferConfig } from "@/lib/products/offer-config";
import { getProductData, getProductDataAllowExcluded } from "@/lib/products/product";
import { recordWebhookLog } from "@/lib/webhook-logs";
import logger from "@/lib/logger";
import { sendOpsAlert } from "@/lib/notifications/ops";
import { normalizeMetadata } from "@/lib/payments/stripe-webhook/metadata";
import { ensureMetadataCaseVariants, getMetadataString } from "@/lib/metadata/metadata-access";
import { processFulfilledOrder, type NormalizedOrder } from "@/lib/payments/order-fulfillment";
import { getStripeClient } from "@/lib/payments/stripe";
import type { SerpAuthEntitlementsGrantResult } from "@/lib/serp-auth/entitlements";

const OPS_ALERT_THRESHOLD = 3;

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
  options?: { primaryPriceId?: string | null },
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
    const stripe = getStripeClient(stripeMode);
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
  const metadata = ensureMetadataCaseVariants(normalizeMetadata(session.metadata));

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
    coerceMetadataString(metadata["productName"]) ??
    coerceMetadataString(metadata["product_name"]) ??
    null;
  ensureMetadataValues(productNameValue, "productName", "product_name");

  const checkoutMode =
    typeof session.livemode === "boolean"
      ? session.livemode ? "live" : "test"
      : metadata.payment_link_mode ?? metadata.paymentLinkMode ?? null;
  const providerMode = typeof session.livemode === "boolean" ? (session.livemode ? "live" : "test") : null;
  if (checkoutMode) {
    metadata.checkout_mode = checkoutMode;
    metadata.checkoutMode = checkoutMode;
    metadata.payment_link_mode = checkoutMode;
    metadata.paymentLinkMode = checkoutMode;
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
    metadata.productSlug = productSlugValue;
  }

  let stripeProductIdValue =
    metadata.stripe_product_id ?? metadata.stripeProductId ?? null;
  if (stripeProductIdValue) {
    metadata.stripe_product_id = stripeProductIdValue;
    metadata.stripeProductId = stripeProductIdValue;
  }

  const metadataTagCandidates: string[] = [];
  appendUniqueString(metadataTagCandidates, metadata.ghl_tag);
  appendUniqueString(metadataTagCandidates, metadata.ghlTag);


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

  const offerId = metadata.offerId
    ?? metadata.product_slug
    ?? metadata.productSlug
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

  const landerId = metadata.landerId ?? metadata.productSlug ?? metadata.product_slug ?? offerId;

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
      ensureMetadataValues(productNameValue, "productName", "product_name");
    }
  }

  ensureMetadataValues(productNameValue, "paymentDescription", "payment_description");

  if (!coerceMetadataString(metadata["description"]) && productNameValue) {
    metadata.description = productNameValue;
  }

  // Ensure Payment Intent has a human-friendly description in Stripe
  try {
    if (paymentIntentId && productNameValue) {
      const stripe = getStripeClient();
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

  if (!metadata.product_slug || !metadata.productSlug) {
    metadata.product_slug = offerId;
    metadata.productSlug = offerId;
  }

  const primaryPriceIdForTags = getMetadataString(metadata, "stripe_price_id") ?? getMetadataString(metadata, "stripePriceId");
  const lineItemTagData = await collectLineItemTagData(session, stripeModeForLineItems, {
    primaryPriceId: primaryPriceIdForTags,
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
  appendFallbackProductSlug(metadata.productSlug);
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
    metadata.ghlTag = primaryGhlTag;
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
    metadata.licenseEntitlementsResolved = resolvedLicenseEntitlements.join(",");
    metadata.licenseEntitlementsResolvedCount = String(resolvedLicenseEntitlements.length);
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

  const productPageUrl =
    offerConfig?.metadata?.productPageUrl
      ?? metadata.productPageUrl
      ?? metadata.product_page_url
      ?? null;

  const storeProductPageUrl =
    offerConfig?.metadata?.store_serp_co_product_page_url
      ?? metadata.store_serp_co_product_page_url
      ?? null;

  const appsProductPageUrl =
    offerConfig?.metadata?.apps_serp_co_product_page_url
      ?? metadata.apps_serp_co_product_page_url
      ?? null;

  const purchaseUrl =
    metadata.purchaseUrl
      ?? metadata.purchase_url
      ?? metadata.serply_link
      ?? metadata.serplyLink
      ?? metadata.checkoutUrl
      ?? metadata.checkout_url
      ?? offerConfig?.metadata?.purchaseUrl
      ?? offerConfig?.metadata?.serply_link
      ?? null;

  const serplyLink =
    metadata.serply_link
      ?? metadata.serplyLink
      ?? purchaseUrl
      ?? offerConfig?.metadata?.serply_link
      ?? null;

  const successUrl =
    metadata.success_url
      ?? metadata.successUrl
      ?? offerConfig?.metadata?.success_url
      ?? offerConfig?.successUrl
      ?? null;

  const cancelUrl =
    metadata.cancel_url
      ?? metadata.cancelUrl
      ?? offerConfig?.metadata?.cancel_url
      ?? offerConfig?.cancelUrl
      ?? null;

  const providerAccountAlias =
    context?.accountAlias
      ?? getMetadataString(metadata, "paymentProviderAccount")
      ?? getMetadataString(metadata, "paymentProviderAccountAlias")
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
    productSlug: metadata.product_slug ?? metadata.productSlug ?? offerId,
    productName: metadata.productName ?? metadata.product_name ?? offerConfig?.productName ?? offerId,
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
