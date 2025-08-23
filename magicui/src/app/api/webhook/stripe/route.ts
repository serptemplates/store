import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { ghlAPI, PurchaseData } from '@/lib/ghl-api';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Sync with GoHighLevel
      if (session.customer_details?.email) {
        const purchaseData: PurchaseData = {
          productId: session.metadata?.productId || '',
          customerEmail: session.customer_details.email,
          customerName: session.customer_details.name || '',
          customerPhone: session.customer_details.phone || undefined,
          amount: (session.amount_total || 0) / 100, // Convert from cents
          currency: session.currency || 'usd',
        };

        try {
          await ghlAPI.processPurchase(purchaseData);
          console.log('Purchase synced with GHL successfully');
        } catch (error) {
          console.error('Error syncing with GHL:', error);
        }
      }
      break;
    
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}