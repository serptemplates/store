"use client";

import type { ReactNode } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";
import SocialProofBanner from "../social-proof-banner";
import { TypographyH2, TypographyLarge, TypographyP, TypographySmall } from "@repo/ui";

export type PricingCtaProps = {
  heading?: string;
  subheading?: string;
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
  subtitle?: string;
  description?: string;
  price?: string;
  originalPrice?: string;
  badge?: string;
  note?: string;
  bullets?: string[];
  benefits?: string[];
  image?: string;
  terms?: string;
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
  className,
  id,
  orderBump,
}: PricingCtaProps) {
  const listItems = (
    benefits?.length ? benefits : features?.length ? features : defaultBenefits
  ).slice(0, 8);

  const showPriceDetails = Boolean(
    price || priceLabel || originalPrice || priceNote
  );

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

  const hasOrderBump = Boolean(orderBump);
  const orderBumpItems = hasOrderBump
    ? (orderBump?.benefits?.length
        ? orderBump.benefits
        : orderBump?.bullets?.length
        ? orderBump.bullets
        : [])
    : [];

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
            <TypographyH2 className="mb-3">
              {heading || "Get Instant Access"}
            </TypographyH2>
            <TypographyP className="mb-6 max-w-xl lg:mb-8">
              {subheading ||
                "Start using our product immediately after checkout. No waiting, no delays."}
            </TypographyP>

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
                hasOrderBump
                  ? "sm:max-w-xl lg:ml-auto lg:max-w-[960px] lg:grid lg:grid-cols-2 lg:items-stretch"
                  : "sm:max-w-md lg:max-w-[460px] lg:ml-auto"
              )}
            >
              <div
                className={cn(
                  "relative flex flex-col rounded-xl bg-white",
                  hasOrderBump ? "h-full" : "mx-auto sm:mx-0"
                )}
                style={{
                  padding: hasOrderBump ? "28px 26px 26px" : "30px 25px 25px",
                  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.12)",
                  border: "1px solid #e5e5e5",
                }}
              >
              {/* Product Title - Mobile Only */}
              <div className="text-center mb-4 lg:hidden">
                <TypographyH2>
                  {heading || "Get Instant Access"}
                </TypographyH2>
                <TypographyP className="mt-2">
                  {subheading ||
                    "Start using our product immediately after checkout. No waiting, no delays."}
                </TypographyP>
              </div>

              {/* Pricing */}
              {showPriceDetails && (
                <div className="text-center mb-4">
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
                </div>
              )}

              {/* Discount Badge */}
              {discountPercentage > 0 && (
                <div className="mb-5 mx-auto w-full">
                  <div
                    className="rounded-md bg-rose-600 px-4 py-2.5 text-center text-[13px] font-bold tracking-wide text-white"
                  >
                    {discountPercentage}% OFF - but only TODAY, on THURSDAY
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
              {(benefits?.length || features?.length) &&
                benefits?.length !== listItems.length && (
                  <div className="mb-4">
                    <TypographySmall className="mb-3 block text-left text-gray-700">
                      Included: <span className="font-semibold text-gray-900">300 critical conversion checkpoints</span>
                    </TypographySmall>
                    <TypographySmall className="block text-left text-gray-700">
                      Checklist last updated: <span className="font-semibold text-gray-900">October 2nd 2025</span>
                    </TypographySmall>
                  </div>
                )}

              {/* CTA Button */}
              <div className="mb-5">
                {onCtaClick ? (
                  <button
                    type="button"
                    onClick={onCtaClick}
                    disabled={ctaDisabled || ctaLoading}
                    className="w-full font-bold transition-all text-base sm:text-lg py-5 px-8 sm:py-6 sm:px-10 lg:py-[30px] lg:px-[45px]"
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
                      cursor: "pointer",
                      position: "relative",
                      zIndex: 2,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 5px 0 1px #000000";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 3px 0 1px #000000";
                    }}
                  >
                    {ctaLoading ? (
                      <>
                        <Loader2 className="inline h-5 w-5 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      ctaText
                    )}
                  </button>
                ) : (
                  <a
                    href={ctaHref}
                    target="_blank"
                    rel="noopener noreferrer"
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
                      cursor: "pointer",
                      position: "relative",
                      zIndex: 2,
                      display: "inline-block",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 5px 0 1px #000000";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 3px 0 1px #000000";
                    }}
                  >
                    {ctaText}
                  </a>
                )}
                {ctaExtra}
              </div>

              {/* Terms/Disclaimer - only show if custom terms provided */}
              {terms && (
                <TypographySmall className="text-center leading-relaxed text-gray-600">
                  {terms}
                </TypographySmall>
              )}
              </div>

              {hasOrderBump && orderBump && (
                <div
                  className="flex h-full flex-col rounded-xl border border-amber-200 bg-gradient-to-b from-amber-50 via-amber-50 to-white p-6 shadow-[0_12px_30px_rgba(255,170,0,0.18)]"
                >
                  {orderBump.badge && (
                    <span className="inline-flex items-center self-start rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                      {orderBump.badge}
                    </span>
                  )}

                  <div className="mt-2 space-y-2">
                    <TypographyLarge className="text-amber-900 text-lg sm:text-xl">
                      {orderBump.title}
                    </TypographyLarge>
                    {orderBump.subtitle && (
                      <TypographySmall className="text-amber-700">
                        {orderBump.subtitle}
                      </TypographySmall>
                    )}
                    {orderBump.description && (
                      <TypographySmall className="text-amber-700">
                        {orderBump.description}
                      </TypographySmall>
                    )}
                  </div>

                  {(orderBump.price || orderBump.originalPrice) && (
                    <div className="mt-4">
                      {orderBump.originalPrice && (
                        <p className="text-sm font-medium text-amber-600/80 line-through">
                          {orderBump.originalPrice}
                        </p>
                      )}
                      {orderBump.price && (
                        <p className="text-3xl font-bold text-amber-900">
                          {orderBump.price}
                        </p>
                      )}
                    </div>
                  )}

                  {orderBumpItems.length > 0 && (
                    <ul className="mt-5 space-y-2">
                      {orderBumpItems.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-amber-800">
                          <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" strokeWidth={3} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {orderBump.note && (
                    <TypographySmall className="mt-4 text-amber-700">
                      {orderBump.note}
                    </TypographySmall>
                  )}

                  <div className="mt-auto">
                    <div className="mt-6 rounded-lg border border-amber-200 bg-white/80 p-3 text-xs font-medium text-amber-800 shadow-sm">
                      {orderBump.defaultSelected
                        ? "Pre-selected during checkout — deselect anytime before completing your order."
                        : "Add this upgrade during checkout with a single click before you pay."}
                    </div>

                    {orderBump.terms && (
                      <TypographySmall className="mt-3 block text-amber-600/90">
                        {orderBump.terms}
                      </TypographySmall>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PricingCta;
