'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { loadStripe } from '@stripe/stripe-js';
import { Product } from '@/lib/ghl-api';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface CheckoutButtonProps {
  product: Product;
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  text?: string;
  useStripe?: boolean;
}

export function CheckoutButton({ 
  product, 
  size = 'default', 
  className = '',
  text = 'Buy Now',
  useStripe = true // Default to Stripe for better UX
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleStripeCheckout = async () => {
    setLoading(true);

    try {
      // Create checkout session
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          productName: product.name,
          price: product.price,
          successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/products/${product.slug}`,
        }),
      });

      const { sessionId } = await response.json();

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({ sessionId });
        if (error) {
          console.error('Stripe redirect error:', error);
        }
      }
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setLoading(false);
    }
  };

  // If using Stripe checkout
  if (useStripe && (!product.paymentLink || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)) {
    return (
      <Button 
        size={size} 
        className={className}
        onClick={handleStripeCheckout}
        disabled={loading}
      >
        {loading ? 'Processing...' : text}
      </Button>
    );
  }

  // Fallback to GHL payment link
  if (product.paymentLink) {
    return (
      <a href={product.paymentLink} target="_blank" rel="noopener noreferrer">
        <Button size={size} className={className}>
          {text}
        </Button>
      </a>
    );
  }

  // If order form URL exists
  if (product.orderFormUrl) {
    return (
      <a href={product.orderFormUrl} target="_blank" rel="noopener noreferrer">
        <Button size={size} className={className}>
          {text}
        </Button>
      </a>
    );
  }

  // No payment method available
  return (
    <Button size={size} className={className} disabled>
      Coming Soon
    </Button>
  );
}