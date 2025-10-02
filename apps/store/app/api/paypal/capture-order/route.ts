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
    // Create order record
    const orderData = {
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

    // Update checkout session with payment metadata
    await updateCheckoutSessionStatus(sessionId, "completed", {
      metadata: orderData.metadata,
    });

    // Sync with GHL if configured
    let syncResult: Awaited<ReturnType<typeof syncOrderWithGhl>> | null = null;
    let syncError: unknown = null;

    if (checkoutSession?.offerId && payer?.email_address) {
      const offer = getOfferConfig(checkoutSession.offerId);

      try {
        syncResult = await syncOrderWithGhl(offer?.ghl, {
          offerId: checkoutSession.offerId,
          offerName: offer?.productName || checkoutSession.offerId,
          customerEmail: payer.email_address,
          customerName: orderData.customerName,
          stripeSessionId: sessionId,
          stripePaymentIntentId: orderData.stripePaymentIntentId,
          amountTotal: amountTotal,
          currency: orderData.currency,
          landerId: checkoutSession.landerId,
          metadata: orderData.metadata as Record<string, string>,
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
