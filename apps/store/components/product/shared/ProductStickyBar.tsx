"use client";

import Image from "next/image";
import type { MouseEventHandler } from "react";

import type { ResolvedHomeCta } from "@/components/product/landers/default/home-template.types";
import type { ProductData } from "@/lib/products/product-schema";
import { cn } from "@repo/ui/lib/utils";

type BaseStickyBarProps = {
  show: boolean;
  productName: string;
};

type DefaultVariantProps = BaseStickyBarProps & {
  variant: "default";
  ctaLabel: string;
  onClick: () => void;
  href?: string;
  openInNewTab?: boolean;
  rel?: string;
};

type MarketplaceVariantProps = BaseStickyBarProps & {
  variant: "marketplace";
  product: ProductData;
  priceLabel?: string | null;
  price?: string | null;
  originalPrice?: string | null;
  brandLogoPath?: string | null;
  mainImageSource?: string | null | undefined;
  waitlistEnabled?: boolean;
  onWaitlistClick?: () => void;
  checkoutCta?: ResolvedHomeCta | null;
  onCheckoutClick?: MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>;
  supportLabel?: string;
};

export type ProductStickyBarProps = DefaultVariantProps | MarketplaceVariantProps;

export function ProductStickyBar(props: ProductStickyBarProps) {
  if (props.variant === "default") {
    return renderDefaultStickyBar(props);
  }

  if (!props.show) {
    return null;
  }

  return renderMarketplaceStickyBar(props);
}

function renderDefaultStickyBar({
  show,
  productName,
  ctaLabel,
  onClick,
  href,
  openInNewTab = false,
  rel,
}: DefaultVariantProps) {
  const ctaClasses =
    "cta-pulse inline-flex items-center justify-center gap-2 rounded-md bg-gradient-to-r from-indigo-500 via-indigo-500 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-[0_12px_20px_-12px_rgba(79,70,229,0.65)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_32px_-14px_rgba(79,70,229,0.7)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-60";
  const trimmedLabel = ctaLabel.trim();
  const displayLabel = trimmedLabel.length > 0 ? trimmedLabel.toUpperCase() : "GET IT NOW";

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[80] transition-transform duration-200",
        show ? "translate-y-0" : "-translate-y-full",
      )}
    >
      <div className="pointer-events-auto border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="container flex h-14 items-center justify-between gap-4">
          <span className="line-clamp-1 text-sm font-semibold text-foreground">{productName}</span>
          {openInNewTab && href ? (
            <a
              href={href}
              target="_blank"
              rel={rel ?? "noopener noreferrer"}
              onClick={(event) => {
                event.preventDefault();
                onClick();
              }}
              className={ctaClasses}
            >
              <span aria-hidden className="text-base">🚀</span>
              <span>{displayLabel}</span>
            </a>
          ) : (
            <button type="button" onClick={onClick} className={ctaClasses}>
              <span aria-hidden className="text-base">🚀</span>
              <span>{displayLabel}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function renderMarketplaceStickyBar({
  product,
  priceLabel,
  price,
  originalPrice,
  brandLogoPath,
  mainImageSource,
  waitlistEnabled = false,
  onWaitlistClick,
  checkoutCta,
  onCheckoutClick,
  supportLabel,
}: MarketplaceVariantProps) {
  const checkoutLabel = (() => {
    const fromCta = checkoutCta?.text?.trim();
    if (fromCta) return fromCta;
    const fromPricing = product.pricing?.cta_text?.trim();
    if (fromPricing) return fromPricing;
    return waitlistEnabled ? "Get Notified 🔔" : "Checkout";
  })();
  const opensInNewTab = checkoutCta?.opensInNewTab ?? false;
  const checkoutRel = checkoutCta?.rel ?? "noopener noreferrer";

  return (
    <div className="fixed inset-x-0 top-0 z-40 bg-white/95 shadow-lg backdrop-blur transition-transform dark:bg-gray-900/95">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-4 py-3">
        <div className="hidden items-center gap-3 sm:flex">
          {mainImageSource ? (
            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
              <Image
                src={mainImageSource}
                alt={product.name}
                fill
                className={brandLogoPath ? "object-contain p-1" : "object-cover"}
                unoptimized
              />
            </div>
          ) : null}
          <div>
            <h3 className="line-clamp-1 text-sm font-semibold">{product.name}</h3>
            {price ? (
              <p className="text-lg font-bold text-green-600">
                {price}
                {originalPrice ? <span className="ml-2 text-sm text-gray-500 line-through">{originalPrice}</span> : null}
              </p>
            ) : null}
            {priceLabel ? <p className="text-xs text-gray-500 dark:text-gray-400">{priceLabel}</p> : null}
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
          {waitlistEnabled ? (
            <button
              type="button"
              onClick={onWaitlistClick}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#ff9e00] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#635bff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#635bff] sm:w-auto sm:text-base whitespace-nowrap"
            >
              <span className="whitespace-nowrap">{checkoutLabel}</span>
            </button>
          ) : checkoutCta ? (
            <>
              {opensInNewTab ? (
                <a
                  href={checkoutCta.href}
                  target="_blank"
                  rel={checkoutRel}
                  onClick={(event) => {
                    event.preventDefault();
                    onCheckoutClick?.(event);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#ff9e00] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#635bff] sm:w-auto sm:text-base whitespace-nowrap"
                >
                  <CartIcon />
                  <span className="whitespace-nowrap">{checkoutLabel}</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={onCheckoutClick}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#ff9e00] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#635bff] sm:w-auto sm:text-base whitespace-nowrap"
                >
                  <CartIcon />
                  <span className="whitespace-nowrap">{checkoutLabel}</span>
                </button>
              )}
              {supportLabel ? <span className="text-center text-xs text-gray-500 sm:text-left">{supportLabel}</span> : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CartIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0z" />
    </svg>
  );
}
