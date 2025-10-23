"use server";

import { getStripeClient } from "@/lib/payments/stripe";
import {
  findCheckoutSessionByStripeSessionId,
  upsertCheckoutSession,
  upsertOrder,
  findOrderByPaymentIntentId,
  findLatestGhlOrder,
} from "@/lib/checkout";
import { createLicenseForOrder } from "@/lib/license-service";
import { updateOrderMetadata } from "@/lib/checkout";
import { getOfferConfig } from "@/lib/products/offer-config";
import { ensureAccountForPurchase } from "@/lib/account/service";
import { getProductData } from "@/lib/products/product";
import logger from "@/lib/logger";

type ProcessedOrderDetails = {
  sessionId: string;
  amount: number | null;
  currency: string | null;
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
  coupon?: string | null;
  affiliateId?: string | null;
  paymentLinkId?: string | null;
  productSlug?: string | null;
  paymentLinkMode?: "live" | "test" | null;
};

type ProcessCheckoutResult = {
  success: boolean;
  message?: string;
  order?: ProcessedOrderDetails;
};

function extractLicenseConfig(metadata: Record<string, unknown> | undefined, offerId: string | null) {
  const tierValue = typeof metadata?.licenseTier === "string" ? metadata?.licenseTier : offerId;
  const entitlementsRaw = metadata?.licenseEntitlements;
  const entitlementsSet = new Set<string>();

  if (Array.isArray(entitlementsRaw)) {
    for (const item of entitlementsRaw) {
      if (item != null) {
        entitlementsSet.add(String(item));
      }
    }
  }

  if (offerId) {
    entitlementsSet.add(offerId);
  }

  const entitlements = Array.from(entitlementsSet);

  const featuresRaw = metadata?.licenseFeatures;
  const features =
    featuresRaw && typeof featuresRaw === "object" && !Array.isArray(featuresRaw)
      ? (featuresRaw as Record<string, unknown>)
      : {};

  return {
    tier: tierValue ?? null,
    entitlements,
    features,
  };
}

function coerceMetadataString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Process a checkout session after successful payment.
 * This is a fallback for development environments where webhooks may not be configured.
 * In production, this is redundant with the webhook but provides idempotency.
 */
export async function processCheckoutSession(sessionId: string): Promise<ProcessCheckoutResult> {
  try {
    const stripe = getStripeClient();
    
    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "payment_intent"],
    });

    if (session.payment_status !== "paid") {
      return {
        success: false,
        message: "Payment not completed",
      };
    }

    // Check if we've already processed this session
    const existingSession = await findCheckoutSessionByStripeSessionId(sessionId);
    const alreadyProcessed = existingSession?.metadata?.processedAt;

    const metadata = (session.metadata ?? {}) as Record<string, unknown>;
    const paymentLinkId =
      typeof session.payment_link === "string"
        ? session.payment_link
        : session.payment_link?.id ?? null;
    const paymentLinkMode: "live" | "test" | null =
      typeof session.livemode === "boolean"
        ? (session.livemode ? "live" : "test")
        : null;

    const metadataOfferId = coerceMetadataString(metadata.offerId);
    const metadataProductSlugCamel = coerceMetadataString(metadata.productSlug);
    const metadataProductSlugSnake = coerceMetadataString(metadata.product_slug);
    const productSlug = metadataProductSlugSnake ?? metadataProductSlugCamel ?? null;
    const offerId =
      metadataOfferId ??
      productSlug ??
      coerceMetadataString(session.client_reference_id) ??
      null;

    if (!offerId) {
      logger.error("checkout.success.missing_offer_id", {
        sessionId,
        metadata,
        clientReferenceId: session.client_reference_id,
      });
      return {
        success: false,
        message: "Missing product information",
      };
    }

    const landerId =
      coerceMetadataString(metadata.landerId) ??
      productSlug ??
      offerId;
    const customerEmail = session.customer_details?.email ?? session.customer_email ?? null;
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    if (!customerEmail) {
      return {
        success: false,
        message: "Missing customer email",
      };
    }

    // Ensure account exists and send verification email if needed
    await ensureAccountForPurchase({
      email: customerEmail,
      name: session.customer_details?.name ?? null,
      offerId,
    });

    const augmentedMetadata: Record<string, unknown> = {
      ...metadata,
    };

    const tosStatus = session.consent?.terms_of_service ?? null;
    if (tosStatus) {
      augmentedMetadata.stripeTermsOfService = tosStatus;
      if (tosStatus === "accepted") {
        augmentedMetadata.tosAccepted = "true";
      } else if (tosStatus === "declined") {
        augmentedMetadata.tosAccepted = "false";
      }
    }

    const tosRequirement = session.consent_collection?.terms_of_service ?? null;
    if (tosRequirement) {
      augmentedMetadata.stripeTermsOfServiceRequirement = tosRequirement;
    }

    if (paymentLinkId) {
      augmentedMetadata.payment_link_id = paymentLinkId;
    }

    if (productSlug) {
      if (!augmentedMetadata.product_slug) {
        augmentedMetadata.product_slug = productSlug;
      }
      if (!augmentedMetadata.productSlug) {
        augmentedMetadata.productSlug = productSlug;
      }
    }

    // Store the order
    const checkoutSessionId = await upsertCheckoutSession({
      stripeSessionId: sessionId,
      offerId,
      landerId,
      paymentIntentId,
      customerEmail,
      metadata: { ...augmentedMetadata, processedAt: new Date().toISOString() },
      status: "completed",
      source: "stripe",
    });

    await upsertOrder({
      checkoutSessionId,
      stripeSessionId: sessionId,
      stripePaymentIntentId: paymentIntentId,
      offerId,
      landerId,
      customerEmail,
      customerName: session.customer_details?.name ?? null,
      amountTotal: session.amount_total ?? null,
      currency: session.currency ?? null,
      metadata: augmentedMetadata,
      paymentStatus: session.payment_status ?? null,
      paymentMethod: session.payment_method_types?.[0] ?? null,
      source: "stripe",
    });

    // Create license if not already processed
    if (!alreadyProcessed) {
      const offerConfig = getOfferConfig(offerId);
      const { tier, entitlements, features } = extractLicenseConfig(offerConfig?.metadata, offerId);

      const amountMajorUnits =
        typeof session.amount_total === "number"
          ? Number((session.amount_total / 100).toFixed(2))
          : null;
      const currencyCode = typeof session.currency === "string" ? session.currency.toLowerCase() : null;

      const licenseMetadata: Record<string, unknown> = {
        orderId: sessionId,
        paymentIntentId,
        stripeSessionId: sessionId,
        offerId,
        amount: amountMajorUnits,
        currency: currencyCode,
      };

      if (paymentLinkId) {
        licenseMetadata.paymentLinkId = paymentLinkId;
      }

      if (productSlug) {
        licenseMetadata.productSlug = productSlug;
      }

      if (paymentLinkMode) {
        licenseMetadata.paymentLinkMode = paymentLinkMode;
      }

      if (session.customer_details?.name) {
        licenseMetadata.customerName = session.customer_details.name;
      }

      if (session.client_reference_id) {
        licenseMetadata.clientReferenceId = session.client_reference_id;
      }

      try {
        const licenseResult = await createLicenseForOrder({
          id: sessionId,
          provider: "stripe",
          providerObjectId: paymentIntentId ?? sessionId,
          userEmail: customerEmail,
          tier,
          entitlements,
          features,
          metadata: licenseMetadata,
          status: session.payment_status ?? "completed",
          eventType: "checkout.completed",
          amount: amountMajorUnits,
          currency: currencyCode,
          rawEvent: {
            checkoutSessionId: sessionId,
            paymentIntentId,
            source: "success_page_fallback",
          },
        });

        if (licenseResult?.licenseKey) {
          const now = new Date().toISOString();
          const licenseMetadataUpdate = {
            license: {
              action: licenseResult.action ?? null,
              licenseId: licenseResult.licenseId ?? null,
              licenseKey: licenseResult.licenseKey ?? null,
              updatedAt: now,
            },
          };

          const updated = await updateOrderMetadata(
            {
              stripePaymentIntentId: paymentIntentId,
              stripeSessionId: sessionId,
            },
            licenseMetadataUpdate
          );

          if (!updated) {
            logger.warn("checkout.success.metadata_update_failed", {
              sessionId,
              paymentIntentId,
            });
          }

          logger.info("checkout.success.processed", {
            sessionId,
            offerId,
            hasLicense: true,
          });
        }
      } catch (error) {
        logger.error("checkout.success.license_error", {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const orderAmount =
      typeof session.amount_total === "number"
        ? Number((session.amount_total / 100).toFixed(2))
        : null;

    const orderItems =
      session.line_items?.data?.map((line) => {
        const quantity = line.quantity ?? 1;
        const lineTotal =
          typeof line.amount_total === "number"
            ? Number((line.amount_total / 100).toFixed(2))
            : null;
        const unitAmountFromTotal =
          lineTotal !== null && quantity > 0
            ? Number((lineTotal / quantity).toFixed(2))
            : null;
        const unitAmountFromPrice =
          typeof line.price?.unit_amount === "number"
            ? Number((line.price.unit_amount / 100).toFixed(2))
            : null;
        const resolvedUnitAmount = unitAmountFromTotal ?? unitAmountFromPrice;
        const resolvedLineTotal =
          lineTotal ?? (resolvedUnitAmount !== null ? Number((resolvedUnitAmount * quantity).toFixed(2)) : null);

        const fallbackProductName =
          coerceMetadataString(augmentedMetadata.productName) ??
          coerceMetadataString(augmentedMetadata.offerName) ??
          offerId ??
          "Product";

        const lineName =
          line.description ??
          (typeof line.price?.product === "string" ? line.price.product : null) ??
          fallbackProductName;

        const fallbackProductSlug =
          coerceMetadataString(augmentedMetadata.productSlug) ??
          offerId ??
          sessionId;

        const lineId =
          (typeof line.price?.product === "string" ? line.price.product : null) ??
          fallbackProductSlug;

        return {
          id: lineId,
          name: lineName,
          price: resolvedUnitAmount ?? resolvedLineTotal ?? 0,
          quantity,
        };
      }) ?? [
        {
          id: coerceMetadataString(augmentedMetadata.productSlug) ?? offerId ?? sessionId,
          name: coerceMetadataString(augmentedMetadata.productName) ?? offerId ?? "Product",
          price: orderAmount ?? 0,
          quantity: 1,
        },
      ];

    const couponCode =
      typeof augmentedMetadata.couponCode === "string"
        ? (augmentedMetadata.couponCode as string)
        : undefined;

    const affiliateIdValue =
      typeof augmentedMetadata.affiliateId === "string"
        ? (augmentedMetadata.affiliateId as string)
        : undefined;

    return {
      success: true,
      message: "Order processed successfully",
      order: {
        sessionId,
        amount: orderAmount,
        currency: session.currency ?? null,
        items: orderItems,
        coupon: couponCode,
        affiliateId: affiliateIdValue,
        paymentLinkId,
        productSlug: productSlug ?? offerId ?? null,
        paymentLinkMode,
      },
    };
  } catch (error) {
    logger.error("checkout.success.process_error", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to process order",
    };
  }
}

type ProcessGhlPaymentParams = {
  paymentId?: string | null;
  productSlug?: string | null;
};

function normalizeGhlPaymentId(rawId: string | null | undefined): string | null {
  if (!rawId) {
    return null;
  }

  const trimmed = rawId.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.startsWith("ghl_") ? trimmed : `ghl_${trimmed}`;
}

function parseDisplayPrice(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Number(parsed.toFixed(2));
}

function coerceCurrency(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }

  const trimmed = code.trim();
  return trimmed ? trimmed.toUpperCase() : null;
}

export async function processGhlPayment(params: ProcessGhlPaymentParams): Promise<ProcessCheckoutResult> {
  const normalizedPaymentId = normalizeGhlPaymentId(params.paymentId);
  const trimmedSlug = params.productSlug?.trim();

  try {
    let order = normalizedPaymentId ? await findOrderByPaymentIntentId(normalizedPaymentId) : null;

    if (!order && trimmedSlug) {
      order = await findLatestGhlOrder({
        offerId: trimmedSlug,
        excludePaymentIntentId: normalizedPaymentId,
      });

      if (order) {
        logger.info("checkout.success.ghl_fallback_order_match", {
          offerId: trimmedSlug,
          paymentIntentId: order.stripePaymentIntentId,
        });
      }
    }

    const resolvedSlug = order?.offerId ?? trimmedSlug ?? null;

    let product: ReturnType<typeof getProductData> | null = null;
    if (resolvedSlug) {
      try {
        product = getProductData(resolvedSlug);
      } catch {
        product = null;
      }
    }

    if (!order && !product) {
      return {
        success: false,
        message: "Unable to locate GHL purchase information.",
      };
    }

    const amountMajorUnits =
      order?.amountTotal != null
        ? Number((order.amountTotal / 100).toFixed(2))
        : parseDisplayPrice(product?.pricing?.price ?? null);

    const resolvedCurrency =
      coerceCurrency(order?.currency) ??
      coerceCurrency(product?.pricing?.currency ?? null);

    const metadata = (order?.metadata ?? {}) as Record<string, unknown>;
    const ghlMeta = (metadata.ghl as Record<string, unknown> | undefined) ?? undefined;
    const customData = (ghlMeta?.customData as Record<string, unknown> | undefined) ?? undefined;

    const couponCode =
      (typeof metadata.couponCode === "string" ? metadata.couponCode : undefined) ??
      (typeof ghlMeta?.couponCode === "string" ? (ghlMeta.couponCode as string) : undefined);

    const affiliateIdFromMetadata =
      (typeof metadata.affiliateId === "string" ? metadata.affiliateId : undefined) ??
      (typeof ghlMeta?.affiliateId === "string" ? (ghlMeta.affiliateId as string) : undefined);

    const affiliateIdFromCustomData =
      (customData && typeof customData.affiliateId === "string"
        ? (customData.affiliateId as string)
        : customData && typeof customData.affiliate_id === "string"
        ? (customData.affiliate_id as string)
        : undefined);

    const affiliateId = affiliateIdFromMetadata ?? affiliateIdFromCustomData ?? null;

    const itemId =
      product?.slug ??
      order?.offerId ??
      resolvedSlug ??
      normalizedPaymentId ??
      "ghl-purchase";

    const itemName =
      product?.name ??
      (typeof metadata.productName === "string" ? (metadata.productName as string) : undefined) ??
      (typeof ghlMeta?.productName === "string" ? (ghlMeta.productName as string) : undefined) ??
      "SERP Purchase";

    const resolvedPrice = amountMajorUnits ?? parseDisplayPrice(product?.pricing?.price ?? null) ?? 0;

    const items: ProcessedOrderDetails["items"] = [
      {
        id: itemId,
        name: itemName,
        price: resolvedPrice,
        quantity: 1,
      },
    ];

    const sessionId =
      order?.stripePaymentIntentId ??
      order?.stripeSessionId ??
      normalizedPaymentId ??
      (resolvedSlug ? `ghl_${resolvedSlug}_${Date.now()}` : `ghl_${Date.now()}`);

    return {
      success: true,
      message: "GHL purchase processed",
      order: {
        sessionId,
        amount: amountMajorUnits ?? resolvedPrice ?? null,
        currency: resolvedCurrency ?? null,
        items,
        coupon: couponCode ?? null,
        affiliateId,
      },
    };
  } catch (error) {
    logger.error("checkout.success.ghl_process_error", {
      paymentId: normalizedPaymentId,
      productSlug: params.productSlug,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to process GHL order",
    };
  }
}
