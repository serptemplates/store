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
  orderBump?: {
    id: string;
    selected: boolean;
  };
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

  const orderBumpConfig = product.order_bump;
  const orderBumpSelected = Boolean(
    params.orderBump?.selected &&
      orderBumpConfig &&
      params.orderBump.id === orderBumpConfig.id,
  );
  const orderBumpPriceInCents = orderBumpSelected && orderBumpConfig?.price
    ? Math.round(parseFloat(orderBumpConfig.price.replace(/[^0-9.]/g, '')) * 100)
    : 0;

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

    const paymentMethodTypes = ['card'] as ['card'];

    const sessionMetadata: Stripe.MetadataParam = {
      offerId: product.slug,
      landerId: product.slug,
      productName: product.name || '',
      environment: stripeMode,
    };

    if (params.affiliateId) {
      sessionMetadata.affiliateId = params.affiliateId;
    }

    if (params.metadata) {
      for (const [key, value] of Object.entries(params.metadata)) {
        sessionMetadata[key] = value;
      }
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

    if (orderBumpSelected && orderBumpPriceInCents > 0 && stripeProduct.id) {
      const orderBumpPrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: orderBumpPriceInCents,
        currency: 'usd',
        metadata: {
          order_bump_id: orderBumpConfig?.id ?? '',
        },
      });

      lineItems.push({
        price: orderBumpPrice.id,
        quantity: 1,
      });

      sessionMetadata.orderBumpId = orderBumpConfig?.id ?? '';
      sessionMetadata.orderBumpSelected = 'true';
      sessionMetadata.orderBumpUnitCents = String(orderBumpPriceInCents);
      if (orderBumpConfig?.price) {
        sessionMetadata.orderBumpDisplayPrice = orderBumpConfig.price;
      }

      if (params.metadata) {
        params.metadata.orderBumpId = orderBumpConfig?.id ?? '';
        params.metadata.orderBumpSelected = 'true';
        if (orderBumpConfig?.price) {
          params.metadata.orderBumpDisplayPrice = orderBumpConfig.price;
        }
      }
    } else {
      sessionMetadata.orderBumpSelected = sessionMetadata.orderBumpSelected ?? 'false';
      if (params.metadata && !params.metadata.orderBumpSelected) {
        params.metadata.orderBumpSelected = 'false';
      }
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: paymentMethodTypes,
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: params.customer?.email,
      metadata: sessionMetadata,
      client_reference_id: product.slug,
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
