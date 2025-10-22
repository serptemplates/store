import Stripe from 'stripe';
import { getProductData } from '@/lib/products/product';
import { getStripeMode, requireStripeSecretKey } from '@/lib/payments/stripe-environment';
import { ensureSuccessUrlHasSessionPlaceholder } from '@/lib/products/offer-config';

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
  successUrl?: string;
  cancelUrl?: string;
}) {
  const stripeMode = getStripeMode();
  const stripeKey = requireStripeSecretKey(stripeMode);

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2024-04-10',
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

    const externalMetadata: Record<string, string> = params.metadata ?? {};

    if (!externalMetadata.checkoutSource) {
      externalMetadata.checkoutSource = 'hosted_checkout_stripe';
    }

    if (!externalMetadata.offerId) {
      externalMetadata.offerId = product.slug;
    }
    if (!externalMetadata.landerId) {
      externalMetadata.landerId = product.slug;
    }

    if (!externalMetadata.ghlTagIds && product.ghl?.tag_ids && product.ghl.tag_ids.length > 0) {
      externalMetadata.ghlTagIds = product.ghl.tag_ids.join(',');
    }

    const sessionMetadata: Stripe.MetadataParam = {
      offerId: product.slug,
      landerId: product.slug,
      productName: product.name || '',
      environment: stripeMode,
      ...externalMetadata,
    };

    sessionMetadata.stripePriceId = stripePrice.id;
    sessionMetadata.stripeProductId = stripeProduct.id;
    externalMetadata.stripePriceId = stripePrice.id;
    externalMetadata.stripeProductId = stripeProduct.id;

    if (params.affiliateId) {
      sessionMetadata.affiliateId = params.affiliateId;
      externalMetadata.affiliateId = params.affiliateId;
    }

    const defaultBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const rawSuccessUrl = params.successUrl
      ?? product.success_url
      ?? `${defaultBaseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const successUrl = ensureSuccessUrlHasSessionPlaceholder(rawSuccessUrl);
    const cancelUrl = params.cancelUrl ?? product.cancel_url ?? `${defaultBaseUrl}/${product.slug}`;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price: stripePrice.id,
        quantity: params.quantity ?? 1,
      },
    ];
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: params.customer?.email,
      metadata: sessionMetadata,
      client_reference_id: product.slug,
    };

    const envPaymentMethods = process.env.STRIPE_CHECKOUT_PAYMENT_METHODS
      ? process.env.STRIPE_CHECKOUT_PAYMENT_METHODS.split(',')
          .map((method) => method.trim())
          .filter((method): method is Stripe.Checkout.SessionCreateParams.PaymentMethodType => method.length > 0)
      : null;

    if (envPaymentMethods?.length) {
      sessionParams.payment_method_types = envPaymentMethods;
    }

    const paymentIntentMetadata: Stripe.MetadataParam = { ...sessionMetadata };

    sessionParams.payment_intent_data = {
      description: product.name || product.slug,
      metadata: paymentIntentMetadata,
    };

    console.log('[SimpleCheckout] Session params:', JSON.stringify(sessionParams, null, 2));

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log('[SimpleCheckout] Session created successfully:', session.id);
    console.log('[SimpleCheckout] Session URL:', session.url);

    return session;
  } catch (error) {
    console.error('[SimpleCheckout] Error creating checkout session:', error);
    if (error instanceof Error) {
      console.error('[SimpleCheckout] Error message:', error.message);
      console.error('[SimpleCheckout] Error stack:', error.stack);
    }
    if (typeof error === 'object' && error !== null && 'type' in error) {
      console.error('[SimpleCheckout] Error type:', (error as { type?: unknown }).type);
    }
    throw error;
  }
}
