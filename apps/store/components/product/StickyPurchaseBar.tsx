"use client";

import Image from "next/image";
import { PayPalCheckoutButton } from "@/components/paypal-button";
import type { ProductData } from "@/lib/product-schema";

export interface StickyPurchaseBarProps {
  product: ProductData;
  priceLabel?: string | null;
  price?: string | null;
  originalPrice?: string | null;
  onCheckout: () => void;
  isLoading: boolean;
  show: boolean;
  brandLogoPath?: string | null;
  mainImageSource?: string | null | undefined;
  affiliateId?: string;
}

export function StickyPurchaseBar({
  product,
  priceLabel,
  price,
  originalPrice,
  onCheckout,
  isLoading,
  show,
  brandLogoPath,
  mainImageSource,
  affiliateId,
}: StickyPurchaseBarProps) {
  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-0 z-40 bg-white/95 shadow-lg backdrop-blur dark:bg-gray-900/95 transition-transform">
      <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {mainImageSource && (
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              <Image
                src={mainImageSource}
                alt={product.name}
                fill
                className={brandLogoPath ? "object-contain p-1" : "object-cover"}
                unoptimized
              />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-sm line-clamp-1">{product.name}</h3>
            {price && (
              <p className="text-lg font-bold text-green-600">
                {price}
                {originalPrice && (
                  <span className="ml-2 text-sm text-gray-500 line-through">{originalPrice}</span>
                )}
              </p>
            )}
            {priceLabel && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{priceLabel}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCheckout}
            disabled={isLoading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? "Processing…" : "Buy Now with Card"}
          </button>
          <PayPalCheckoutButton
            offerId={product.slug}
            price={price ?? product.pricing?.price ?? "$0"}
            affiliateId={affiliateId}
            metadata={{ landerId: product.slug }}
            className="px-6 py-2 rounded-lg font-semibold"
            buttonText="PayPal"
          />
        </div>
      </div>
    </div>
  );
}
