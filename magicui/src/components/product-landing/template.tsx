'use client';

import { Product } from '../../../../schema';
import ProductHero from './hero';
import ProductFeatures from './features';
import VideoShowcase from './video-showcase';
import ProductInstallation from './installation';
import ProductUsage from './usage';
import ProductPricing from './pricing';
import ProductFAQ from './faq';
import ProductCTA from './cta';
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

interface ProductLandingTemplateProps {
  product: Product;
  stripePublicKey?: string;
  paypalClientId?: string;
}

export default function ProductLandingTemplate({ 
  product, 
  stripePublicKey,
  paypalClientId 
}: ProductLandingTemplateProps) {
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handlePurchase = async () => {
    setIsProcessingPayment(true);
    
    try {
      if (stripePublicKey && product.store_product_id) {
        // Initialize Stripe
        const stripe = await loadStripe(stripePublicKey);
        
        if (!stripe) {
          throw new Error('Failed to load Stripe');
        }

        // Create checkout session
        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: product.store_product_id,
            productName: product.name,
            productDescription: product.tagline,
          }),
        });

        const { sessionId } = await response.json();

        // Redirect to Stripe Checkout
        const { error } = await stripe.redirectToCheckout({
          sessionId,
        });

        if (error) {
          console.error('Stripe checkout error:', error);
        }
      } else if (product.purchase_url) {
        // Fallback to direct purchase URL (could be PayPal or other)
        window.open(product.purchase_url, '_blank');
      } else {
        console.error('No payment method configured');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="min-h-screen">
      <ProductHero product={product} onPurchase={handlePurchase} />
      <VideoShowcase product={product} />
      <ProductFeatures product={product} />
      <ProductInstallation product={product} />
      <ProductUsage product={product} />
      <ProductPricing product={product} onPurchase={handlePurchase} paypalClientId={paypalClientId} />
      <ProductFAQ product={product} />
      <ProductCTA product={product} onPurchase={handlePurchase} />
    </div>
  );
}