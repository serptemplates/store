'use client';

import { Product } from '../../../../schema';
import { Button } from '@/components/ui/button';
import { Check, Zap, CreditCard } from 'lucide-react';
import { useState } from 'react';
import PayPalButton from './paypal-button';

interface ProductPricingProps {
  product: Product;
  onPurchase?: () => void;
  paypalClientId?: string;
}

export default function ProductPricing({ product, onPurchase, paypalClientId }: ProductPricingProps) {
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal'>('stripe');
  
  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get lifetime access with a one-time purchase
          </p>
        </div>

        <div className="max-w-lg mx-auto">
          <div className="relative rounded-2xl border-2 border-primary/20 bg-card p-8 shadow-xl">
            <div className="absolute -top-5 left-0 right-0 mx-auto w-32 rounded-full bg-gradient-to-r from-primary to-primary/80 px-3 py-2 text-center text-sm font-medium text-primary-foreground">
              BEST VALUE
            </div>

            <div className="mb-8 text-center">
              <h3 className="mb-2 text-2xl font-bold">{product.name}</h3>
              <p className="text-muted-foreground">{product.tagline}</p>
            </div>

            <div className="mb-8 flex items-baseline justify-center">
              <span className="text-5xl font-bold">$49</span>
              <span className="ml-2 text-muted-foreground">/lifetime</span>
            </div>

            <ul className="mb-8 space-y-4">
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-500" />
                <span>Lifetime access</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-500" />
                <span>All future updates</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-500" />
                <span>Priority support</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-500" />
                <span>Commercial license</span>
              </li>
              {product.github_repo_url && (
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Source code access</span>
                </li>
              )}
            </ul>

            {/* Payment Method Selector - Only show if PayPal is configured */}
            {paypalClientId && false && ( // Disabled for now, set to true to enable PayPal option
              <div className="flex gap-2 mb-4">
                <Button
                  variant={paymentMethod === 'stripe' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setPaymentMethod('stripe')}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Card
                </Button>
                <Button
                  variant={paymentMethod === 'paypal' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setPaymentMethod('paypal')}
                >
                  PayPal
                </Button>
              </div>
            )}

            {/* Payment Buttons - Currently Stripe only */}
            <Button 
              onClick={onPurchase}
              size="lg" 
              className="w-full group"
              disabled={product.status !== 'live'}
            >
              <Zap className="mr-2 h-4 w-4" />
              {product.status === 'live' ? 'Get Instant Access' : 'Coming Soon'}
            </Button>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Secure payment via Stripe
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}