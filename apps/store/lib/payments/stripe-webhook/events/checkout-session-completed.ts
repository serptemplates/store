import type Stripe from "stripe";

import { findCheckoutSessionByStripeSessionId } from "@/lib/checkout";
import { getOfferConfig } from "@/lib/products/offer-config";
import { getProductData } from "@/lib/products/product";
import { recordWebhookLog } from "@/lib/webhook-logs";
import logger from "@/lib/logger";
import { sendOpsAlert } from "@/lib/notifications/ops";
import { normalizeMetadata } from "@/lib/payments/stripe-webhook/metadata";
import { ensureMetadataCaseVariants, getMetadataString } from "@/lib/metadata/metadata-access";
import { processFulfilledOrder, type NormalizedOrder } from "@/lib/payments/order-fulfillment";
import { getStripeClient } from "@/lib/payments/stripe";

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

async function collectLineItemTagData(
  session: Stripe.Checkout.Session,
  stripeMode: StripeModeInput,
): Promise<{ tagIds: string[]; productSlugs: string[] }> {
  const tagIds: string[] = [];
  const productSlugs: string[] = [];

  if (!session.id) {
    return { tagIds, productSlugs };
  }

  try {
    const stripe = getStripeClient(stripeMode);
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      expand: ["data.price.product"],
      limit: 100,
    });

    for (const item of lineItems.data ?? []) {
      const price = item.price ?? null;
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
  } catch (error) {
    logger.warn("stripe.checkout_line_items_fetch_failed", {
      sessionId: session.id,
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
  }

  return { tagIds, productSlugs };
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  eventId?: string,
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

  let ghlTagValue = metadata.ghl_tag ?? metadata.ghlTag ?? null;
  if (ghlTagValue) {
    metadata.ghl_tag = ghlTagValue;
    metadata.ghlTag = ghlTagValue;
  }


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

  if (!metadata.ghl_tag && !metadata.ghlTag) {
    const fallbackTag =
      offerConfig?.ghl?.tagIds && offerConfig.ghl.tagIds.length > 0
        ? offerConfig.ghl.tagIds[0]
        : (() => {
            try {
              const product = getProductData(offerId);
              return product.ghl?.tag_ids?.[0] ?? null;
            } catch {
              return null;
            }
          })();

    if (fallbackTag) {
      metadata.ghl_tag = fallbackTag;
      metadata.ghlTag = fallbackTag;
      ghlTagValue = fallbackTag;
    }
  }

  const lineItemTagData = await collectLineItemTagData(session, stripeModeForLineItems);
  const resolvedGhlTagIds: string[] = [];
  const appendTagId = (value: unknown) => appendUniqueString(resolvedGhlTagIds, value);

  appendTagId(ghlTagValue);
  appendTagId(metadata.ghl_tag);
  appendTagId(metadata.ghlTag);

  for (const entry of lineItemTagData.tagIds) {
    appendTagId(entry);
  }

  if (offerConfig?.ghl?.tagIds) {
    for (const entry of offerConfig.ghl.tagIds) {
      appendTagId(entry);
    }
  }

  const productSlugCandidates: string[] = [];
  const appendProductSlug = (value: unknown) => appendUniqueString(productSlugCandidates, value);

  appendProductSlug(productSlugValue);
  appendProductSlug(metadata.product_slug);
  appendProductSlug(metadata.productSlug);
  appendProductSlug(offerId);

  for (const slug of lineItemTagData.productSlugs) {
    appendProductSlug(slug);
  }

  for (const slug of productSlugCandidates) {
    if (!slug) continue;
    try {
      const product = getProductData(slug);
      const productTags = Array.isArray(product?.ghl?.tag_ids) ? product.ghl.tag_ids : [];
      for (const tag of productTags) {
        appendTagId(tag);
      }
    } catch (error) {
      logger.debug("product.lookup_failed_for_ghl_tags", {
        slug,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (resolvedGhlTagIds.length > 0) {
    metadata.ghl_tag = resolvedGhlTagIds[0];
    metadata.ghlTag = resolvedGhlTagIds[0];
    ghlTagValue = resolvedGhlTagIds[0];
  }

  if (paymentIntentId) {
    await recordWebhookLog({
      paymentIntentId,
      stripeSessionId: session.id,
      eventType: "checkout.session.completed",
      offerId,
      landerId,
      status: "pending",
      metadata,
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
    tosAccepted: metadata.tosAccepted === "true" ? true : metadata.tosAccepted === "false" ? false : null,
    skipSideEffects: alreadySynced,
  };

  const fulfillmentResult = await processFulfilledOrder(normalizedOrder);
  const licenseEntitlements =
    fulfillmentResult.licenseConfig.entitlements.length > 0 ? fulfillmentResult.licenseConfig.entitlements : null;

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
