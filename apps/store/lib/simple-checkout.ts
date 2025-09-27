import Stripe from 'stripe';
import { getProductData } from './product';

/**
 * Simple checkout that creates Stripe prices on the fly from product data
 * This avoids needing to configure Stripe price IDs for each product
 */
export async function createSimpleCheckout(params: {
  offerId: string;
  quantity?: number;
  metadata?: Record<string, string>;
  customer?: {
    email?: string;
    name?: string;
  };
  affiliateId?: string;
}) {
  // Require STRIPE_SECRET_KEY to be set
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2024-04-10' as any,
  });

  // Get product data
  console.log('[SimpleCheckout] Getting product:', params.offerId);
  const product = getProductData(params.offerId);
  if (!product) {
    console.error('[SimpleCheckout] Product not found:', params.offerId);
    throw new Error(`Product not found: ${params.offerId}`);
  }
  console.log('[SimpleCheckout] Product found:', product.name);

  // Extract price from product
  const priceString = product.pricing?.price?.replace(/[^0-9.]/g, '') || '0';
  const priceInCents = Math.round(parseFloat(priceString) * 100);

  if (priceInCents === 0) {
    throw new Error(`Invalid price for product: ${params.offerId}`);
  }

  // Create or get product in Stripe
  let stripeProduct: Stripe.Product;
  try {
    // Try to retrieve existing product
    const products = await stripe.products.search({
      query: `metadata['slug']:'${product.slug}'`,
      limit: 1,
    });

    if (products.data.length > 0) {
      stripeProduct = products.data[0];
    } else {
      // Create new product
      stripeProduct = await stripe.products.create({
        name: product.name || product.slug,
        description: product.tagline || product.seo_description,
        images: product.featured_image && product.featured_image.startsWith('http')
          ? [product.featured_image]
          : undefined,
        metadata: {
          slug: product.slug,
          platform: product.platform || '',
        },
      });
    }
  } catch (error) {
    console.error('Error creating/retrieving product:', error);
    throw error;
  }

  // Create price for the product
  let stripePrice: Stripe.Price;
  try {
    // Create a new price each time (for simplicity)
    stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: priceInCents,
      currency: 'usd',
      metadata: {
        original_price: product.pricing?.original_price || '',
      },
    });
  } catch (error) {
    console.error('Error creating price:', error);
    throw error;
  }

  // Create checkout session
  try {
    console.log('[SimpleCheckout] Creating checkout session...');
    console.log('[SimpleCheckout] Using price:', stripePrice.id);
    console.log('[SimpleCheckout] Customer email:', params.customer?.email);

    const sessionParams = {
      payment_method_types: ['card'] as const,
      line_items: [{
        price: stripePrice.id,
        quantity: params.quantity || 1,
      }],
      mode: 'payment' as const,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/${product.slug}`,
      customer_email: params.customer?.email,
      metadata: {
        ...params.metadata,
        offerId: product.slug,
        landerId: product.slug,
        affiliateId: params.affiliateId || '',
        productName: product.name || '',
        environment: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test') ? 'test' : 'live',
      },
      client_reference_id: product.slug,
    };

    console.log('[SimpleCheckout] Session params:', JSON.stringify(sessionParams, null, 2));

    const session = await stripe.checkout.sessions.create(sessionParams as any);

    console.log('[SimpleCheckout] Session created successfully:', session.id);
    console.log('[SimpleCheckout] Session URL:', session.url);

    return session;
  } catch (error: any) {
    console.error('[SimpleCheckout] Error creating checkout session:', error);
    console.error('[SimpleCheckout] Error message:', error.message);
    console.error('[SimpleCheckout] Error type:', error.type);
    console.error('[SimpleCheckout] Error stack:', error.stack);
    throw error;
  }
}