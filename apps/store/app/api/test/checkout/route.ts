import { NextRequest, NextResponse } from "next/server";
import { createSimpleCheckout } from "@/lib/simple-checkout";
import { markStaleCheckoutSessions, upsertCheckoutSession } from "@/lib/checkout-store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[Test Checkout] Request:', body);

    // Create checkout session
    let session;
    try {
      session = await createSimpleCheckout({
        offerId: body.offerId || 'loom-video-downloader',
        quantity: body.quantity || 1,
        metadata: body.metadata || {},
        customer: body.customer,
        affiliateId: body.affiliateId,
      });
      console.log('[Test Checkout] Session created:', session?.id);
    } catch (checkoutError) {
      console.error('[Test Checkout] Failed to create session:', checkoutError);
      throw checkoutError;
    }

    // Only save to database if we have a session
    if (session && session.id) {
      console.log('[Test Checkout] Saving to database...');
      try {
        await markStaleCheckoutSessions();
        const saveResult = await upsertCheckoutSession({
          stripeSessionId: session.id,  // Changed from stripe_session_id to stripeSessionId
          paymentIntentId: session.payment_intent as string | null,  // Changed from stripe_payment_intent_id
          offerId: body.offerId || 'loom-video-downloader',  // Changed from offer_id
          landerId: body.offerId || 'loom-video-downloader',  // Changed from lander_id
          customerEmail: body.customer?.email || null,  // Changed from customer_email
          metadata: {
            ...body.metadata,
            affiliateId: body.affiliateId,
          },
          status: 'pending',
          source: 'stripe',
        });
        console.log('[Test Checkout] Database save result:', saveResult);
      } catch (dbError) {
        console.error('[Test Checkout] Database save failed:', dbError);
      }
    }

    return NextResponse.json({
      id: session.id,
      sessionId: session.id,
      url: session.url,
      amount: session.amount_total,
      status: 'success',
    });
  } catch (error) {
    console.error('Test checkout failed:', error);
    return NextResponse.json(
      { error: `Checkout failed: ${(error as Error).message}` },
      { status: 502 }
    );
  }
}