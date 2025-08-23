'use client';

import { useEffect, useRef } from 'react';
import { Product } from '../../../../schema';

interface PayPalButtonProps {
  product: Product;
  amount: string;
  clientId: string;
  onSuccess?: (details: any) => void;
  onError?: (error: any) => void;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

export default function PayPalButton({ 
  product, 
  amount, 
  clientId,
  onSuccess,
  onError 
}: PayPalButtonProps) {
  const paypalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!clientId) return;

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
    script.async = true;
    
    script.onload = () => {
      if (window.paypal && paypalRef.current) {
        window.paypal.Buttons({
          createOrder: (data: any, actions: any) => {
            return actions.order.create({
              purchase_units: [{
                description: product.name,
                amount: {
                  currency_code: 'USD',
                  value: amount,
                },
              }],
              application_context: {
                shipping_preference: 'NO_SHIPPING',
              }
            });
          },
          onApprove: async (data: any, actions: any) => {
            const order = await actions.order.capture();
            if (onSuccess) {
              onSuccess(order);
            }
          },
          onError: (err: any) => {
            console.error('PayPal error:', err);
            if (onError) {
              onError(err);
            }
          },
          style: {
            layout: 'horizontal',
            color: 'blue',
            shape: 'rect',
            label: 'paypal',
            height: 48,
          }
        }).render(paypalRef.current);
      }
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [clientId, amount, product.name, onSuccess, onError]);

  if (!clientId) {
    return null;
  }

  return (
    <div className="w-full">
      <div ref={paypalRef} className="paypal-button-container" />
      <p className="text-xs text-muted-foreground text-center mt-2">
        Secure payment powered by PayPal
      </p>
    </div>
  );
}