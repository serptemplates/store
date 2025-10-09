"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ProductData } from "@/lib/products/product-schema";
import { useAnalytics } from "@/components/analytics/gtm";

export interface StickyPurchaseBarProps {
  product: ProductData;
  priceLabel?: string | null;
  price?: string | null;
  originalPrice?: string | null;
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
  show,
  brandLogoPath,
  mainImageSource,
  affiliateId,
}: StickyPurchaseBarProps) {
  const router = useRouter();
  const { trackClickBuyButton } = useAnalytics();

  if (!show) {
    return null;
  }

  const handleCheckout = () => {
    // Extract numeric price
    let numericPrice = 0;
    if (price) {
      const priceStr = price.replace(/[^0-9.]/g, '');
      numericPrice = parseFloat(priceStr) || 0;
    }

    // Track the buy button click
    trackClickBuyButton({
      productId: product.slug || "",
      productName: product.name,
      checkoutType: 'stripe',
      price: numericPrice,
    });

    const params = new URLSearchParams();
    params.set("product", product.slug || "");
    if (affiliateId) {
      params.set("aff", affiliateId);
    }
    router.push(`/checkout?${params.toString()}`);
  };

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
            onClick={handleCheckout}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Checkout</span>
          </button>
          <span className="text-xs text-gray-500">Cards • PayPal</span>
        </div>
      </div>
    </div>
  );
}
