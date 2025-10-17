"use server";

import { getStripeClient } from "@/lib/payments/stripe";
import {
  findCheckoutSessionByStripeSessionId,
  upsertCheckoutSession,
  upsertOrder,
  findOrderByPaymentIntentId,
  findOrderByPaypalOrderId,
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

    const metadata = session.metadata ?? {};
    const offerId =
      metadata.offerId ??
      metadata.productSlug ??
      session.client_reference_id ??
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

    const landerId = metadata.landerId ?? metadata.productSlug ?? offerId;
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

    // Store the order
    const checkoutSessionId = await upsertCheckoutSession({
      stripeSessionId: sessionId,
      offerId,
      landerId,
      paymentIntentId,
      customerEmail,
      metadata: { ...metadata, processedAt: new Date().toISOString() },
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
      metadata,
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

        const lineName =
          line.description ??
          (typeof line.price?.product === "string" ? line.price.product : undefined) ??
          metadata.productName ??
          metadata.offerName ??
          offerId ??
          "Product";

        const lineId =
          (typeof line.price?.product === "string" ? line.price.product : undefined) ??
          metadata.productSlug ??
          offerId ??
          sessionId;

        return {
          id: lineId,
          name: lineName,
          price: resolvedUnitAmount ?? resolvedLineTotal ?? 0,
          quantity,
        };
      }) ?? [
        {
          id: offerId ?? sessionId,
          name: metadata.productName ?? offerId ?? "Product",
          price: orderAmount ?? 0,
          quantity: 1,
        },
      ];

    const couponCode = typeof metadata.couponCode === "string" ? metadata.couponCode : undefined;

    const affiliateIdValue =
      typeof metadata.affiliateId === "string" ? metadata.affiliateId : undefined;

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

type ProcessPaypalOrderParams = {
  orderId: string;
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

// Type for order upsert - extracted for reuse
type CheckoutOrderUpsertType = {
  checkoutSessionId?: number | null;
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
  stripeChargeId?: string | null;
  amountTotal: number;
  currency: string;
  offerId: string;
  landerId: string;
  customerEmail: string;
  customerName?: string | null;
  metadata?: Record<string, unknown>;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  source: "stripe" | "paypal" | "ghl";
};

export async function processPaypalOrder(params: ProcessPaypalOrderParams): Promise<ProcessCheckoutResult> {
  const trimmedOrderId = params.orderId.trim();

  if (!trimmedOrderId) {
    return {
      success: false,
      message: "Missing PayPal order identifier",
    };
  }

  try {
    // First, try to find an existing order
    let order = await findOrderByPaypalOrderId(trimmedOrderId);

    // If order doesn't exist, it may need to be captured first
    // This happens when user is redirected to PayPal and returns after payment
    if (!order) {
      logger.info("checkout.success.paypal_order_not_found_attempting_capture", {
        orderId: trimmedOrderId,
      });

      try {
        // Import PayPal capture function dynamically to avoid circular dependencies
        const { capturePayPalOrder, isPayPalConfigured } = await import("@/lib/payments/paypal");
        const { 
          findCheckoutSessionByStripeSessionId, 
          updateCheckoutSessionStatus, 
          upsertOrder
        } = await import("@/lib/checkout");
        const { syncOrderWithGhl } = await import("@/lib/ghl-client");
        const { getOfferConfig } = await import("@/lib/products/offer-config");
        const { createLicenseForOrder } = await import("@/lib/license-service");

        if (!isPayPalConfigured()) {
          logger.error("checkout.success.paypal_not_configured");
          return {
            success: false,
            message: "PayPal is not configured",
          };
        }

        // Capture the PayPal payment
        const captureResult = await capturePayPalOrder(trimmedOrderId);

        // Get checkout session from database
        const sessionId = `paypal_${trimmedOrderId}`;
        const checkoutSession = await findCheckoutSessionByStripeSessionId(sessionId);

        if (!checkoutSession) {
          logger.warn("checkout.success.paypal_session_missing", {
            orderId: trimmedOrderId,
          });
        }

        // Extract payment details
        const capture = captureResult.purchase_units?.[0]?.payments?.captures?.[0];
        const payer = captureResult.payer;

        const amountTotal = capture?.amount?.value
          ? Math.round(parseFloat(capture.amount.value) * 100)
          : 0;

        // Create order record
        const orderData: CheckoutOrderUpsertType = {
          checkoutSessionId: checkoutSession?.id || null,
          stripeSessionId: sessionId,
          stripePaymentIntentId: `paypal_${capture?.id || trimmedOrderId}`,
          stripeChargeId: capture?.id || null,
          amountTotal: amountTotal,
          currency: capture?.amount?.currency_code || "USD",
          offerId: checkoutSession?.offerId || "",
          landerId: checkoutSession?.landerId || checkoutSession?.offerId || "",
          customerEmail: payer?.email_address || checkoutSession?.customerEmail || "",
          customerName:
            payer?.name && (payer.name.given_name || payer.name.surname)
              ? `${payer.name.given_name || ""} ${payer.name.surname || ""}`.trim()
              : checkoutSession?.metadata?.customerName?.toString() ?? "",
          metadata: {
            ...checkoutSession?.metadata,
            paypalOrderId: trimmedOrderId,
            paypalCaptureId: capture?.id,
            source: "paypal",
          },
          paymentStatus: captureResult.status,
          paymentMethod: "paypal",
          source: "paypal" as const,
        };

        await upsertOrder(orderData);

        // Process license if we have an email
        let licenseResult: Awaited<ReturnType<typeof createLicenseForOrder>> = null;
        let licenseTier: string | null = null;
        let licenseEntitlements: string[] | null = null;
        let licenseFeatures: Record<string, unknown> | null = null;

        if (payer?.email_address) {
          const { tier, entitlements, features } = (() => {
            const licenseTier = typeof checkoutSession?.metadata?.licenseTier === "string"
              ? (checkoutSession?.metadata?.licenseTier as string)
              : checkoutSession?.offerId ?? null;

            const rawEntitlements = checkoutSession?.metadata?.licenseEntitlements;
            const entitlementsSet = new Set<string>();

            if (Array.isArray(rawEntitlements)) {
              for (const item of rawEntitlements) {
                if (item != null) {
                  entitlementsSet.add(String(item));
                }
              }
            }

            if (checkoutSession?.offerId) {
              entitlementsSet.add(checkoutSession.offerId);
            }

            const entitlementsList = Array.from(entitlementsSet);

            const rawFeatures = checkoutSession?.metadata?.licenseFeatures;
            const featuresMap = rawFeatures && typeof rawFeatures === "object" && !Array.isArray(rawFeatures)
              ? (rawFeatures as Record<string, unknown>)
              : {};

            return {
              tier: licenseTier,
              entitlements: entitlementsList,
              features: featuresMap,
            };
          })();

          licenseTier = tier ?? null;
          licenseEntitlements = entitlements.length > 0 ? entitlements : null;
          licenseFeatures = Object.keys(features).length > 0 ? features : null;

          const amountMajorUnits = typeof amountTotal === "number" ? Number((amountTotal / 100).toFixed(2)) : null;

          const licenseMetadata: Record<string, unknown> = {
            orderId: trimmedOrderId,
            paypalCaptureId: capture?.id ?? null,
            checkoutSessionId: checkoutSession?.id ?? null,
            offerId: checkoutSession?.offerId ?? null,
            amount: amountMajorUnits,
            currency: capture?.amount?.currency_code?.toLowerCase() ?? null,
          };

          try {
            licenseResult = await createLicenseForOrder({
              id: trimmedOrderId,
              provider: "paypal",
              providerObjectId: capture?.id ?? trimmedOrderId,
              userEmail: payer.email_address,
              tier,
              entitlements,
              features,
              metadata: licenseMetadata,
              status: captureResult.status ?? "completed",
              eventType: "checkout.completed",
              amount: amountMajorUnits,
              currency: capture?.amount?.currency_code?.toLowerCase() ?? null,
              rawEvent: {
                orderId: trimmedOrderId,
                captureId: capture?.id ?? null,
                checkoutSessionId: checkoutSession?.id ?? null,
              },
            });

            if (licenseResult && orderData.stripePaymentIntentId) {
              const now = new Date().toISOString();
              await upsertOrder({
                stripePaymentIntentId: orderData.stripePaymentIntentId,
                source: orderData.source,
                metadata: {
                  license: {
                    action: licenseResult.action ?? null,
                    licenseId: licenseResult.licenseId ?? null,
                    licenseKey: licenseResult.licenseKey ?? null,
                    updatedAt: now,
                  },
                },
              });
            }
          } catch (error) {
            logger.error("checkout.success.paypal_license_failure", {
              orderId: trimmedOrderId,
              error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
            });
          }
        }

        if (licenseResult?.licenseKey) {
          orderData.metadata = {
            ...(orderData.metadata ?? {}),
            licenseKey: licenseResult.licenseKey,
          };
        }

        if (licenseResult?.licenseId) {
          orderData.metadata = {
            ...(orderData.metadata ?? {}),
            licenseId: licenseResult.licenseId,
          };
        }

        // Update checkout session with payment metadata
        await updateCheckoutSessionStatus(sessionId, "completed", {
          metadata: orderData.metadata,
        });

        // Sync with GHL if configured
        if (checkoutSession?.offerId && payer?.email_address) {
          const offer = getOfferConfig(checkoutSession.offerId);
          const sessionMetadata = (checkoutSession.metadata ?? {}) as Record<string, unknown>;

          const sessionProductPage = sessionMetadata["productPageUrl"]
            ?? sessionMetadata["product_page_url"]
            ?? sessionMetadata["productPageURL"];
          const sessionPurchaseUrl = sessionMetadata["purchaseUrl"]
            ?? sessionMetadata["purchase_url"]
            ?? sessionMetadata["serply_link"]
            ?? sessionMetadata["checkoutUrl"]
            ?? sessionMetadata["checkout_url"];

          const productPageUrl =
            (typeof offer?.metadata?.productPageUrl === "string" ? offer.metadata.productPageUrl : undefined)
            ?? (typeof sessionProductPage === "string" ? sessionProductPage : undefined)
            ?? null;

          const purchaseUrl =
            (typeof sessionPurchaseUrl === "string" ? sessionPurchaseUrl : undefined)
            ?? (typeof offer?.metadata?.purchaseUrl === "string" ? offer.metadata.purchaseUrl : undefined)
            ?? null;

          const amountFormatted = capture?.amount?.value && capture?.amount?.currency_code
            ? new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: capture.amount.currency_code,
              }).format(Number(capture.amount.value))
            : undefined;

          try {
            await syncOrderWithGhl(offer?.ghl, {
              offerId: checkoutSession.offerId,
              offerName: offer?.productName || checkoutSession.offerId,
              customerEmail: payer.email_address,
              customerName: orderData.customerName,
              stripeSessionId: sessionId,
              stripePaymentIntentId: orderData.stripePaymentIntentId,
              amountTotal: amountTotal,
              amountFormatted,
              currency: orderData.currency,
              landerId: checkoutSession.landerId,
              metadata: orderData.metadata as Record<string, string>,
              productPageUrl,
              purchaseUrl,
              provider: "paypal",
              licenseKey: licenseResult?.licenseKey ?? undefined,
              licenseId: licenseResult?.licenseId ?? undefined,
              licenseAction: licenseResult?.action ?? undefined,
              licenseEntitlements: licenseEntitlements ?? undefined,
              licenseTier: licenseTier ?? undefined,
              licenseFeatures: licenseFeatures ?? undefined,
            });
          } catch (ghlError) {
            logger.error("checkout.success.paypal_ghl_sync_failed", {
              orderId: trimmedOrderId,
              error: ghlError instanceof Error ? { name: ghlError.name, message: ghlError.message } : String(ghlError),
            });
          }
        }

        logger.info("checkout.success.paypal_order_captured_successfully", {
          orderId: trimmedOrderId,
        });

        // Fetch the order from database
        order = await findOrderByPaypalOrderId(trimmedOrderId);
      } catch (captureError) {
        logger.error("checkout.success.paypal_capture_error", {
          orderId: trimmedOrderId,
          error: captureError instanceof Error ? captureError.message : String(captureError),
        });
      }
    }

    if (!order) {
      return {
        success: false,
        message: "Unable to locate or process PayPal order information.",
      };
    }

    const metadata = (order.metadata ?? {}) as Record<string, unknown>;

    const offerId =
      order.offerId ??
      (typeof metadata.offerId === "string" ? (metadata.offerId as string) : undefined) ??
      (typeof metadata.productSlug === "string" ? (metadata.productSlug as string) : undefined) ??
      null;

    let product: ReturnType<typeof getProductData> | null = null;
    if (offerId) {
      try {
        product = getProductData(offerId);
      } catch {
        product = null;
      }
    }

    const amountMajorUnits =
      typeof order.amountTotal === "number" ? Number((order.amountTotal / 100).toFixed(2)) : null;

    const resolvedCurrency =
      coerceCurrency(order.currency) ??
      coerceCurrency(product?.pricing?.currency ?? null);

    const couponCode =
      (typeof metadata.couponCode === "string" ? (metadata.couponCode as string) : undefined) ??
      (typeof metadata.coupon === "string" ? (metadata.coupon as string) : undefined);

    const affiliateId =
      (typeof metadata.affiliateId === "string" ? (metadata.affiliateId as string) : undefined) ??
      (typeof metadata.affiliate_id === "string" ? (metadata.affiliate_id as string) : undefined) ??
      null;

    const displayPrice = parseDisplayPrice(product?.pricing?.price ?? null);
    const resolvedPrice = amountMajorUnits ?? displayPrice ?? 0;

    const itemId = product?.slug ?? offerId ?? trimmedOrderId;
    const itemName =
      product?.name ??
      (typeof metadata.productName === "string" ? (metadata.productName as string) : undefined) ??
      "SERP Purchase";

    const sessionId =
      order.stripeSessionId ??
      order.stripePaymentIntentId ??
      `paypal_${trimmedOrderId}`;

    return {
      success: true,
      message: "PayPal order processed",
      order: {
        sessionId,
        amount: amountMajorUnits ?? resolvedPrice ?? null,
        currency: resolvedCurrency ?? null,
        items: [
          {
            id: itemId,
            name: itemName,
            price: resolvedPrice,
            quantity: 1,
          },
        ],
        coupon: couponCode ?? null,
        affiliateId,
      },
    };
  } catch (error) {
    logger.error("checkout.success.paypal_process_error", {
      orderId: trimmedOrderId,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to process PayPal order",
    };
  }
}
