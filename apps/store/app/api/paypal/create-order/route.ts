import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPayPalOrder, isPayPalConfigured } from "@/lib/paypal";
import { getOfferConfig } from "@/lib/offer-config";
import { getProductData } from "@/lib/product";
import { markStaleCheckoutSessions, upsertCheckoutSession } from "@/lib/checkout-store";

const requestSchema = z.object({
  offerId: z.string().min(1, "offerId is required"),
  quantity: z.number().int().min(1).max(10).optional().default(1),
  affiliateId: z.string().min(1).optional(),
  metadata: z.record(z.string()).optional(),
  customer: z
    .object({
      email: z.string().email("Invalid email").optional(),
      name: z.string().max(120).optional(),
    })
    .optional(),
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

  const offer = getOfferConfig(parsedBody.offerId);

  if (!offer) {
    return NextResponse.json(
      { error: `Offer ${parsedBody.offerId} is not configured` },
      { status: 404 }
    );
  }

  // Get product data for price
  const product = getProductData(parsedBody.offerId);
  const priceString = product.pricing?.price?.replace(/[^0-9.]/g, "") || "0";
  const price = parseFloat(priceString);
  const totalAmount = (price * parsedBody.quantity).toFixed(2);

  try {
    // Mark stale checkout sessions
    await markStaleCheckoutSessions();

    // Create PayPal order
    const paypalOrder = await createPayPalOrder({
      amount: totalAmount,
      currency: "USD",
      description: product.name || `Purchase of ${parsedBody.offerId}`,
      offerId: parsedBody.offerId,
      metadata: {
        ...parsedBody.metadata,
        affiliateId: parsedBody.affiliateId || "",
        customerEmail: parsedBody.customer?.email || "",
        customerName: parsedBody.customer?.name || "",
      },
    });

    // Store checkout session in database
    await upsertCheckoutSession({
      stripeSessionId: `paypal_${paypalOrder.id}`,
      paymentIntentId: null,
      offerId: parsedBody.offerId,
      landerId: parsedBody.offerId,
      customerEmail: parsedBody.customer?.email || null,
      metadata: {
        ...parsedBody.metadata,
        affiliateId: parsedBody.affiliateId,
        paypalOrderId: paypalOrder.id,
        source: "paypal",
      },
      status: "pending",
      source: "paypal",
    });

    return NextResponse.json({
      orderId: paypalOrder.id,
      status: paypalOrder.status,
      links: paypalOrder.links,
    });
  } catch (error) {
    console.error("Failed to create PayPal order:", error);
    return NextResponse.json(
      { error: "Failed to create PayPal order" },
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