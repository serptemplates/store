import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { capturePayPalOrder, isPayPalConfigured } from "@/lib/paypal";
import {
  findCheckoutSessionByStripeSessionId,
  updateCheckoutSessionStatus,
  upsertOrder,
} from "@/lib/checkout-store";
import { syncOrderWithGhl } from "@/lib/ghl-client";
import { getOfferConfig } from "@/lib/offer-config";

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
    if (checkoutSession) {
      await updateCheckoutSessionStatus(checkoutSession.id, "completed");
    }

    // Create order record
    const orderData = {
      checkout_session_id: checkoutSession?.id || null,
      stripe_session_id: sessionId,
      stripe_payment_intent_id: `paypal_${capture?.id || parsedBody.orderId}`,
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
        paypalOrderId: parsedBody.orderId,
        paypalCaptureId: capture?.id,
        source: "paypal",
      },
      payment_status: captureResult.status,
      payment_method: "paypal",
      source: "paypal" as const,
    };

    await upsertOrder(orderData);

    // Sync with GHL if configured
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
        // Don't fail the payment capture due to GHL sync error
      }
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