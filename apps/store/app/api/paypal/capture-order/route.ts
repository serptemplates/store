import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { capturePayPalOrder, isPayPalConfigured } from "@/lib/payments/paypal";
import {
  findCheckoutSessionByStripeSessionId,
  updateCheckoutSessionStatus,
  upsertOrder,
  type CheckoutOrderUpsert,
} from "@/lib/checkout/store";
import { syncOrderWithGhl } from "@/lib/ghl-client";
import { getOfferConfig } from "@/lib/products/offer-config";
import { createLicenseForOrder } from "@/lib/license-service";

const requestSchema = z.object({
  orderId: z.string().min(1, "orderId is required"),
});

export async function POST(request: NextRequest) {
  // Check if PayPal is configured
  if (!isPayPalConfigured()) {
    return NextResponse.json(
      { error: "PayPal is not configured" },
      { status: 503 }
    );
  }

  let parsedBody: z.infer<typeof requestSchema>;

  try {
    const json = await request.json();
    parsedBody = requestSchema.parse(json);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  try {
    // Capture the PayPal payment
    const captureResult = await capturePayPalOrder(parsedBody.orderId);

    // Get checkout session from database
    const sessionId = `paypal_${parsedBody.orderId}`;
    const checkoutSession = await findCheckoutSessionByStripeSessionId(sessionId);

    if (!checkoutSession) {
      console.error("Checkout session not found for PayPal order:", parsedBody.orderId);
    }

    // Extract payment details
    const capture = captureResult.purchase_units[0]?.payments?.captures?.[0];
    const payer = captureResult.payer;

    const amountTotal = capture?.amount?.value
      ? Math.round(parseFloat(capture.amount.value) * 100)
      : 0;

    // Update checkout session status
    // Create order record
    const orderData: CheckoutOrderUpsert = {
      checkoutSessionId: checkoutSession?.id || null,
      stripeSessionId: sessionId,
      stripePaymentIntentId: `paypal_${capture?.id || parsedBody.orderId}`,
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
        paypalOrderId: parsedBody.orderId,
        paypalCaptureId: capture?.id,
        source: "paypal",
      },
      paymentStatus: captureResult.status,
      paymentMethod: "paypal",
      source: "paypal" as const,
    };

    await upsertOrder(orderData);

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
        orderId: parsedBody.orderId,
        paypalCaptureId: capture?.id ?? null,
        checkoutSessionId: checkoutSession?.id ?? null,
        offerId: checkoutSession?.offerId ?? null,
        amount: amountMajorUnits,
        currency: capture?.amount?.currency_code?.toLowerCase() ?? null,
      };

      try {
        licenseResult = await createLicenseForOrder({
          id: parsedBody.orderId,
          provider: "paypal",
          providerObjectId: capture?.id ?? parsedBody.orderId,
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
            orderId: parsedBody.orderId,
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
        console.error("Failed to create license:", error instanceof Error ? error.message : error);
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
    let syncResult: Awaited<ReturnType<typeof syncOrderWithGhl>> | null = null;
    let syncError: unknown = null;

    if (checkoutSession?.offerId && payer?.email_address) {
      const offer = getOfferConfig(checkoutSession.offerId);
      const sessionMetadata = (checkoutSession.metadata ?? {}) as Record<string, unknown>;

      const sessionProductPage = sessionMetadata["productPageUrl"]
        ?? sessionMetadata["product_page_url"]
        ?? sessionMetadata["productPageURL"];
      const sessionPurchaseUrl = sessionMetadata["purchaseUrl"]
        ?? sessionMetadata["purchase_url"]
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
        syncResult = await syncOrderWithGhl(offer?.ghl, {
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
        console.error("Failed to sync with GHL:", ghlError);
        syncError = ghlError;
        // Don't fail the payment capture due to GHL sync error
      }
    }

    if (syncResult) {
      const metadataUpdate: Record<string, string> = {
        ghlSyncedAt: new Date().toISOString(),
        ghlSyncError: "",
      };

      if (syncResult.contactId) {
        metadataUpdate.ghlContactId = syncResult.contactId;
      }

      await updateCheckoutSessionStatus(sessionId, "completed", {
        metadata: metadataUpdate,
      });
    } else if (syncError) {
      await updateCheckoutSessionStatus(sessionId, "completed", {
        metadata: {
          ghlSyncError:
            syncError instanceof Error ? syncError.message : String(syncError),
        },
      });
    }

    return NextResponse.json({
      orderId: parsedBody.orderId,
      status: captureResult.status,
      amount: capture?.amount,
      payer: {
        email: payer?.email_address,
        name: payer?.name,
      },
    });
  } catch (error) {
    console.error("Failed to capture PayPal order:", error);
    return NextResponse.json(
      { error: "Failed to capture PayPal payment" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
