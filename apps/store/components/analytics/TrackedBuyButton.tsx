"use client";

import { useAnalytics } from "./gtm";

interface TrackedBuyButtonProps {
  productId: string;
  productName: string;
  checkoutType: 'stripe' | 'paypal' | 'ghl';
  price?: number;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  href?: string;
}

export function TrackedBuyButton({
  productId,
  productName,
  checkoutType,
  price,
  onClick,
  children,
  className,
  href,
}: TrackedBuyButtonProps) {
  const { trackClickBuyButton, trackOutboundClick } = useAnalytics();

  const handleClick = (e: React.MouseEvent) => {
    // Track the buy button click
    trackClickBuyButton({
      productId,
      productName,
      checkoutType,
      price,
    });

    // Track outbound click if it's a GHL link
    if (href && (href.includes('ghl.serp.co') || href.includes('paypal.com'))) {
      trackOutboundClick({
        linkUrl: href,
        productName,
        productId,
      });
    }

    // Call the original onClick handler if provided
    if (onClick) {
      onClick();
    }
  };

  // If href is provided, render as an anchor
  if (href) {
    return (
      <a
        href={href}
        onClick={handleClick}
        className={className}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    );
  }

  // Otherwise render as a button
  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
    >
      {children}
    </button>
  );
}
