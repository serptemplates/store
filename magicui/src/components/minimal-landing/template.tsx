'use client';

import { Product } from '../../../../schema';
import MinimalHero from './hero';
import MinimalFeatures from './features';
import MinimalVideo from './video';
import MinimalPricing from './pricing';
import MinimalFAQ from './faq';

interface MinimalLandingTemplateProps {
  product: Product;
  stripePublicKey?: string;
}

export default function MinimalLandingTemplate({ 
  product, 
  stripePublicKey
}: MinimalLandingTemplateProps) {
  
  const handlePurchase = async () => {
    if (!stripePublicKey || !product.store_product_id) {
      console.error('Stripe not configured');
      return;
    }

    // For now, just log - Stripe integration will be added later
    console.log('Purchase clicked for:', product.name);
    
    // When ready to integrate Stripe, uncomment:
    // const stripe = await loadStripe(stripePublicKey);
    // ... checkout logic
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <MinimalHero product={product} onPurchase={handlePurchase} />
      <MinimalVideo product={product} />
      <MinimalFeatures product={product} />
      <MinimalPricing product={product} onPurchase={handlePurchase} />
      <MinimalFAQ product={product} />
    </div>
  );
}