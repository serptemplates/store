"use client";

import type { MouseEvent, ReactNode } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";
import SocialProofBanner from "../social-proof-banner";
import { TypographyH2, TypographyLarge, TypographyP, TypographySmall } from "@repo/ui";

export type PricingCtaProps = {
  heading?: string;
  subheading?: string;
  productName?: string;
  priceLabel?: string;
  price?: string; // e.g., "$16/month"
  originalPrice?: string; // e.g., "$97"
  priceNote?: string; // e.g., "With a 7-day free trial"
  ctaText?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  ctaLoading?: boolean;
  ctaDisabled?: boolean;
  ctaExtra?: ReactNode; // Additional content to show after the CTA button
  terms?: ReactNode;
  benefits?: string[];
  /** @deprecated kept for backwards compatibility */
  features?: string[];
  className?: string;
  id?: string;
  orderBump?: PricingCtaOrderBump;
};

export type PricingCtaOrderBump = {
  id?: string;
  title: string;
  description?: string;
  price?: string;
  bullets?: string[];
  points?: string[];
  image?: string;
  defaultSelected?: boolean;
};

const defaultBenefits = [
  "Instant access after checkout",
  "Lifetime license and updates",
  "Supports private videos",
  "Unlimited downloads included",
  "Works on macOS, Windows, and Linux",
];

export function PricingCta({
  heading = "Get it Now",
  subheading = "Download videos instantly with zero friction.",
  priceLabel,
  price,
  originalPrice,
  priceNote,
  ctaText = "GET IT NOW",
  ctaHref = "#download",
  onCtaClick,
  ctaLoading = false,
  ctaDisabled = false,
  ctaExtra,
  terms,
  benefits,
  features,
  productName,
  className,
  id,
  orderBump,
}: PricingCtaProps) {
  const prioritizedBenefits =
    (benefits?.filter((item): item is string => Boolean(item && item.trim())) ?? []).length > 0
      ? benefits
      : (features?.filter((item): item is string => Boolean(item && item.trim())) ?? []).length > 0
        ? features
        : defaultBenefits;

  const normalizedBenefits =
    prioritizedBenefits?.filter((item): item is string => Boolean(item && item.trim())) ?? [];

  const listItems = (normalizedBenefits.length > 0 ? normalizedBenefits : defaultBenefits).slice(0, 8);

  const showPriceDetails = Boolean(
    price || priceLabel || originalPrice || priceNote
  );
  const fallbackProductName = productName?.trim() || heading?.trim() || "SERP Apps";

  const socialProofConfig = {
    userCount: 1938,
    starRating: 5,
  } as const;

  // Calculate discount percentage if original price exists
  let discountPercentage = 0;
  if (originalPrice && price) {
    const originalNum = parseFloat(originalPrice.replace(/[^0-9.]/g, ""));
    const currentNum = parseFloat(price.replace(/[^0-9.]/g, ""));
    if (originalNum && currentNum) {
      discountPercentage = Math.round((1 - currentNum / originalNum) * 100);
    }
  }

  const orderBumpHasContent =
    Boolean(orderBump?.title) ||
    Boolean(orderBump?.description) ||
    Boolean(orderBump?.price) ||
    Boolean(orderBump?.image) ||
    (orderBump?.points?.length ?? 0) > 0 ||
    (orderBump?.bullets?.length ?? 0) > 0;

  const shouldRenderOrderBump = Boolean(orderBump) && orderBumpHasContent;

  const orderBumpItems: string[] = shouldRenderOrderBump
    ? orderBump?.points?.length
      ? orderBump.points.filter((item): item is string => Boolean(item && item.trim()))
      : orderBump?.bullets?.length
      ? orderBump.bullets.filter((item): item is string => Boolean(item && item.trim()))
      : []
    : [];

  // Avoid duplicate accessible names when a primary hero CTA also says "Get It Now"
  // If the visible text is the default, adjust the aria-label so tests and a11y treat it as a distinct control
  const normalizedCtaText = (ctaText || '').trim();
  const ctaAriaLabel = /get it now/i.test(normalizedCtaText) ? 'Buy Now' : undefined;

  const computedHref = ctaHref ?? "#";
  const isCtaBusy = Boolean(ctaDisabled || ctaLoading);

  const handleAnchorClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isCtaBusy) {
      event.preventDefault();
      return;
    }

    if (onCtaClick) {
      event.preventDefault();
      onCtaClick();
    }
  };

  const handleHoverIn = (element: HTMLAnchorElement | null) => {
    if (!element || isCtaBusy) return;
    element.style.transform = "translateY(-2px)";
    element.style.boxShadow = "0 5px 0 1px #000000";
  };

  const handleHoverOut = (element: HTMLAnchorElement | null) => {
    if (!element) return;
    element.style.transform = "translateY(0)";
    element.style.boxShadow = "0 3px 0 1px #000000";
  };

  return (
    <section
      id={id}
      className={cn("py-10 sm:py-16 lg:py-20 px-4", className)}
      style={{ backgroundColor: "#f8f8f8" }}
    >
      <div className="relative mx-auto" style={{ maxWidth: "1200px" }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left side content - Hidden on mobile */}
          <div className="hidden lg:flex flex-col justify-center px-4 order-2 lg:order-1">
            {/* Key Value Props - Hidden on mobile, shown on lg+ */}
            <div className="hidden lg:block space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 mt-1 flex-shrink-0"
                  style={{ color: "#fbbf24" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <div>
                  <TypographyLarge className="text-gray-900">Instant Download</TypographyLarge>
                  <TypographySmall className="text-gray-600">
                    Get access immediately after payment
                  </TypographySmall>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 mt-1 flex-shrink-0"
                  style={{ color: "#4ade80" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <div>
                  <TypographyLarge className="text-gray-900">Lifetime Updates</TypographyLarge>
                  <TypographySmall className="text-gray-600">
                    All future updates included at no extra cost
                  </TypographySmall>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 mt-1 flex-shrink-0"
                  style={{ color: "#60a5fa" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
                <div>
                  <TypographyLarge className="text-gray-900">Premium Support</TypographyLarge>
                  <TypographySmall className="text-gray-600">
                    Get help when you need it
                  </TypographySmall>
                </div>
              </div>
            </div>

            <SocialProofBanner
              className="hidden lg:block mt-8"
              avatars={[]}
              userCount={socialProofConfig.userCount}
              starRating={socialProofConfig.starRating}
              align="start"
            />

          </div>

          {/* Right side - pricing card */}
          <div className="relative order-1 lg:order-2">
            <div
              className={cn(
                "relative mx-auto flex flex-col gap-6 sm:mx-0",
                shouldRenderOrderBump
                  ? "sm:max-w-xl lg:ml-auto lg:max-w-[960px] lg:grid lg:grid-cols-2 lg:items-stretch"
                  : "sm:max-w-md lg:max-w-[460px] lg:ml-auto"
              )}
            >
              <div
                className={cn(
                  "relative flex flex-col rounded-xl bg-white",
                  shouldRenderOrderBump ? "h-full" : "mx-auto sm:mx-0"
                )}
                style={{
                  padding: shouldRenderOrderBump ? "28px 26px 26px" : "30px 25px 25px",
                  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.12)",
                  border: "1px solid #e5e5e5",
                }}
              >
              {/* Pricing / Product Identifier */}
              <div className="text-center mb-4">
                {showPriceDetails ? (
                  <>
                    {originalPrice && (
                      <div className="mb-1 text-2xl font-normal text-slate-600 line-through sm:text-3xl">
                        {originalPrice}
                      </div>
                    )}
                    {price && (
                      <div
                        className="font-bold text-5xl sm:text-6xl"
                        style={{
                          lineHeight: "0.9",
                          color: "#000000",
                          fontFamily:
                            "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {price}
                      </div>
                    )}
                    {priceLabel && (
                      <TypographySmall className="mt-2 italic text-gray-600">
                        {priceLabel}
                      </TypographySmall>
                    )}
                    {priceNote && (
                      <TypographySmall className="text-gray-600">
                        {priceNote}
                      </TypographySmall>
                    )}
                  </>
                ) : (
                  <TypographyH2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                    {fallbackProductName}
                  </TypographyH2>
                )}
              </div>

              {/* Discount Badge */}
              {discountPercentage > 0 && (
                <div className="mb-5 mx-auto w-full">
                  <div
                    className="rounded-md bg-rose-600 px-4 py-2.5 text-center text-[13px] font-bold tracking-wide text-white"
                  >
                    Save {discountPercentage}% today — limited-time offer
                  </div>
                </div>
              )}

              <div className="my-4 border-t border-gray-200" />

              {/* Benefits List */}
              <div className="mb-6">
                <div className="space-y-2.5">
                  {listItems.map((feat, index) => (
                    <div key={index} className="flex items-center gap-2.5">
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      <TypographySmall className="text-gray-700">
                        {feat}
                      </TypographySmall>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:hidden mt-2 mb-6">
                <SocialProofBanner
                  avatars={[]}
                  userCount={socialProofConfig.userCount}
                  starRating={socialProofConfig.starRating}
                />
              </div>

              <div className="my-4 border-t border-gray-200" />

              {/* Additional info if provided */}
              {/* CTA Button */}
              <div className="mb-5">
                <a
                  href={computedHref}
                  target={onCtaClick ? undefined : "_blank"}
                  rel={onCtaClick ? undefined : "noopener noreferrer"}
                  aria-label={ctaAriaLabel}
                  aria-disabled={isCtaBusy ? "true" : undefined}
                  onClick={handleAnchorClick}
                  className="block w-full font-bold transition-all text-center text-base sm:text-lg py-5 px-8 sm:py-6 sm:px-10 lg:py-[30px] lg:px-[45px]"
                  style={{
                    backgroundImage: "linear-gradient(#ffe252, #fed300)",
                    color: "#000000",
                    fontWeight: "700",
                    borderRadius: "101px",
                    borderTop: "none",
                    borderLeft: "none",
                    borderRight: "none",
                    borderBottom: "5px solid #d0ad00",
                    boxShadow: "0 3px 0 1px #000000",
                    fontFamily:
                      '"Circular Std Font", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                    letterSpacing: "0px",
                    lineHeight: "1.3em",
                    textDecoration: "none",
                    cursor: isCtaBusy ? "not-allowed" : "pointer",
                    position: "relative",
                    zIndex: 2,
                    display: "inline-block",
                    opacity: isCtaBusy ? 0.7 : 1,
                  }}
                  onMouseEnter={(e) => handleHoverIn(e.currentTarget)}
                  onMouseLeave={(e) => handleHoverOut(e.currentTarget)}
                >
                  {ctaLoading ? (
                    <>
                      <Loader2 className="inline h-5 w-5 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    ctaText
                  )}
                </a>
                {ctaExtra}
              </div>

              </div>

              {shouldRenderOrderBump && orderBump && (
                <aside
                  data-testid="pricing-cta-order-bump"
                  className="flex h-full flex-col gap-5 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-[0_10px_28px_rgba(15,23,42,0.08)]"
                >
                  <div className="space-y-3">
                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-600">
                      Optional upgrade
                    </span>
                    <TypographyLarge className="text-lg font-semibold text-slate-900 sm:text-xl">
                      {orderBump.title}
                    </TypographyLarge>
                    {orderBump.price && (
                      <p className="text-sm font-semibold text-slate-500">
                        Add for {orderBump.price}
                      </p>
                    )}
                    {orderBump.description && (
                      <TypographySmall className="text-slate-600">
                        {orderBump.description}
                      </TypographySmall>
                    )}
                  </div>

                  {orderBumpItems.length > 0 && (
                    <ul className="space-y-2">
                      {orderBumpItems.map((item, index) => (
                        <li key={index} className="flex items-start gap-3 text-sm text-slate-600">
                          <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className="mt-auto rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                    {orderBump.defaultSelected
                      ? "Selected for you during checkout. You can remove it before paying."
                      : "Keep an eye out for this add-on — you can include it with one click at checkout."}
                  </p>
                </aside>
              )}
            </div>
          </div>
        </div>

        {/* Terms / Disclaimer */}
        {terms ? (
          <div className="mt-8 flex w-full justify-center">
            <div className="max-w-4xl px-4 text-center">
              {typeof terms === "string" ? (
                <TypographySmall className="leading-relaxed text-gray-600">{terms}</TypographySmall>
              ) : (
                terms
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default PricingCta;
