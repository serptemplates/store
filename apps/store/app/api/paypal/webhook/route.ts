import { NextRequest, NextResponse } from "next/server";
import { verifyPayPalWebhook, getPayPalOrder } from "@/lib/paypal";
import {
  findCheckoutSessionByStripeSessionId,
  updateCheckoutSessionStatus,
  upsertOrder,
} from "@/lib/checkout-store";
import { syncOrderWithGhl } from "@/lib/ghl-client";
import { getOfferConfig } from "@/lib/offer-config";
import { recordWebhookLog } from "@/lib/webhook-logs";
import logger from "@/lib/logger";

const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || "";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headers: Record<string, string> = {};

  // Extract PayPal webhook headers
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  // Verify webhook signature if webhook ID is configured
  if (PAYPAL_WEBHOOK_ID) {
    try {
      const isValid = await verifyPayPalWebhook({
        headers,
        body,
        webhookId: PAYPAL_WEBHOOK_ID,
      });

      if (!isValid) {
        logger.error("paypal.webhook_signature_invalid");
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 401 }
        );
      }
    } catch (error) {
      logger.error("paypal.webhook_verification_error", {
        error: error instanceof Error ? error.message : String(error)
      });
      // Continue processing even if verification fails in development
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "Webhook verification failed" },
          { status: 401 }
        );
      }
    }
  }

  const event = JSON.parse(body);

  logger.info("paypal.webhook_received", { eventType: event.event_type });

  try {
    switch (event.event_type) {
      case "PAYMENT.CAPTURE.COMPLETED":
      case "CHECKOUT.ORDER.COMPLETED": {
        const orderId = event.resource?.supplementary_data?.related_ids?.order_id ||
                       event.resource?.id;

        if (!orderId) {
          logger.error("paypal.missing_order_id");
          return NextResponse.json({ received: true });
        }

        // Get full order details
        const paypalOrder = await getPayPalOrder(orderId);

        // Get checkout session from database
        const sessionId = `paypal_${orderId}`;
        const checkoutSession = await findCheckoutSessionByStripeSessionId(sessionId);

        if (!checkoutSession) {
          logger.warn("paypal.session_not_found", { orderId });
        }

        // Extract payment details
        const capture = paypalOrder.purchase_units[0]?.payments?.captures?.[0];
        const payer = paypalOrder.payer;

        const amountTotal = capture?.amount?.value
          ? Math.round(parseFloat(capture.amount.value) * 100)
          : 0;

        // Update checkout session status
        if (checkoutSession) {
          await updateCheckoutSessionStatus(checkoutSession.id, "completed");
        }

        // Create or update order record
        const orderData = {
          checkout_session_id: checkoutSession?.id || null,
          stripeSessionId: sessionId,
          stripe_payment_intent_id: `paypal_${capture?.id || orderId}`,
          stripe_charge_id: capture?.id || null,
          amount_total: amountTotal,
          currency: capture?.amount?.currency_code || "USD",
          offer_id: checkoutSession?.offerId || "",
          lander_id: checkoutSession?.landerId || checkoutSession?.offerId || "",
          customer_email: payer?.email_address || checkoutSession?.customerEmail || "",
          customer_name: payer?.name
            ? `${payer.name.given_name || ""} ${payer.name.surname || ""}`.trim()
            : "",
          metadata: {
            ...checkoutSession?.metadata,
            paypalOrderId: orderId,
            paypalCaptureId: capture?.id,
            paypalEventType: event.event_type,
            source: "paypal",
          },
          payment_status: "completed",
          payment_method: "paypal",
          source: "paypal" as const,
        };

        await upsertOrder(orderData);

        // Record webhook success
        await recordWebhookLog({
          paymentIntentId: orderData.stripe_payment_intent_id,
          stripeSessionId: sessionId,
          eventType: event.event_type,
          offerId: orderData.offer_id,
          landerId: orderData.lander_id,
          status: "success",
          metadata: {
            source: "paypal",
            orderId,
          },
        });

        // Sync with GHL
        if (checkoutSession?.offerId && payer?.email_address) {
          const offer = getOfferConfig(checkoutSession.offerId);

          try {
            await syncOrderWithGhl(offer?.ghl, {
              offerId: checkoutSession.offerId,
              offerName: offer?.productName || checkoutSession.offerId,
              customerEmail: payer.email_address,
              customerName: orderData.customer_name,
              stripeSessionId: sessionId,
              stripePaymentIntentId: orderData.stripe_payment_intent_id,
              amountTotal: amountTotal,
              currency: orderData.currency,
              landerId: checkoutSession.landerId,
              metadata: orderData.metadata as Record<string, string>,
            });
          } catch (ghlError) {
            console.error("Failed to sync with GHL:", ghlError);
            // Log the error but don't fail the webhook
            await recordWebhookLog({
              paymentIntentId: orderData.stripe_payment_intent_id,
              stripeSessionId: sessionId,
              eventType: "ghl_sync_failed",
              offerId: orderData.offer_id,
              landerId: orderData.lander_id,
              status: "error",
              lastError: ghlError instanceof Error ? ghlError.message : "Unknown error",
              metadata: {
                source: "paypal",
                orderId,
              },
            });
          }
        }

        break;
      }

      case "PAYMENT.CAPTURE.DENIED":
      case "PAYMENT.CAPTURE.REFUNDED": {
        const orderId = event.resource?.supplementary_data?.related_ids?.order_id ||
                       event.resource?.id;

        if (orderId) {
          const sessionId = `paypal_${orderId}`;
          const checkoutSession = await findCheckoutSessionByStripeSessionId(sessionId);

          if (checkoutSession) {
            const status = event.event_type === "PAYMENT.CAPTURE.REFUNDED" ? "failed" : "failed";
            await updateCheckoutSessionStatus(checkoutSession.id, status);
          }
        }

        break;
      }

      default:
        logger.debug("paypal.webhook_unhandled", { eventType: event.event_type });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("paypal.webhook_processing_error", {
      error: error instanceof Error ? error.message : String(error),
      eventType: event.event_type
    });

    // Record webhook error
    if (event.resource?.id) {
      await recordWebhookLog({
        paymentIntentId: `paypal_${event.resource.id}`,
        stripeSessionId: `paypal_${event.resource.id}`,
        eventType: event.event_type,
        offerId: "",
        landerId: "",
        status: "error",
        lastError: error instanceof Error ? error.message : "Unknown error",
        metadata: {
          source: "paypal",
          eventId: event.id,
        },
      });
    }

    return NextResponse.json(
      { error: "Webhook processing failed" },
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
      "Access-Control-Allow-Headers": "*",
    },
  });
}