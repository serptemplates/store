"use client";

import Image from "next/image";
import Link from "next/link";
import type { ProductData } from "@/lib/products/product-schema";

export interface StickyPurchaseBarProps {
  product: ProductData;
  priceLabel?: string | null;
  price?: string | null;
  originalPrice?: string | null;
  show: boolean;
  brandLogoPath?: string | null;
  mainImageSource?: string | null | undefined;
  affiliateId?: string;
  waitlistEnabled?: boolean;
  onWaitlistClick?: () => void;
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
  waitlistEnabled = false,
  onWaitlistClick,
}: StickyPurchaseBarProps) {
  if (!show) {
    return null;
  }

  const checkoutQuery: Record<string, string> = { product: product.slug };
  if (affiliateId) {
    checkoutQuery.aff = affiliateId;
  }
  const checkoutHref = { pathname: "/checkout" as const, query: checkoutQuery } as const;

  return (
    <div className="fixed inset-x-0 top-0 z-40 bg-white/95 shadow-lg backdrop-blur dark:bg-gray-900/95 transition-transform">
      <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="hidden items-center gap-3 sm:flex">
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

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
          {waitlistEnabled ? (
            <button
              type="button"
              onClick={onWaitlistClick}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 sm:w-auto sm:text-base whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="whitespace-nowrap">Get Notified</span>
            </button>
          ) : (
            <>
              <Link
                href={checkoutHref}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto sm:text-base whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="whitespace-nowrap">Checkout</span>
              </Link>
              <span className="text-center text-xs text-gray-500 sm:text-left">Cards • PayPal</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
