"use client";

import type { ReactNode } from "react";
import { Check, Zap, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@repo/ui";
import { cn } from "@repo/ui";
import SocialProofBanner from "@repo/ui/social-proof-banner";

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
}: PricingCtaProps) {
  const listItems = (
    benefits?.length ? benefits : features?.length ? features : defaultBenefits
  ).slice(0, 8);

  const showPriceDetails = Boolean(
    price || priceLabel || originalPrice || priceNote
  );

  const socialProofConfig = {
    userCount: 694,
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
            {/* Product Title & Description */}
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              {heading || "Get Instant Access"}
            </h2>
            <p className="text-lg md:text-xl text-gray-600 mb-6 lg:mb-8">
              {subheading ||
                "Start using our product immediately after checkout. No waiting, no delays."}
            </p>

            <SocialProofBanner
              className="hidden lg:block mb-8"
              avatars={[]}
              userCount={socialProofConfig.userCount}
              starRating={socialProofConfig.starRating}
            />

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
                  <h3 className="font-semibold text-gray-900">
                    Instant Download
                  </h3>
                  <p className="text-sm text-gray-600">
                    Get access immediately after payment
                  </p>
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
                  <h3 className="font-semibold text-gray-900">
                    Lifetime Updates
                  </h3>
                  <p className="text-sm text-gray-600">
                    All future updates included at no extra cost
                  </p>
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
                  <h3 className="font-semibold text-gray-900">
                    Premium Support
                  </h3>
                  <p className="text-sm text-gray-600">
                    Get help when you need it
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Right side - pricing card */}
          <div className="relative order-1 lg:order-2">
            <div
              className="relative flex flex-col bg-white rounded-xl mx-auto sm:mx-0 sm:max-w-md lg:max-w-[460px] lg:ml-auto lg:p-[40px_35px_35px]"
              style={{
                padding: "30px 25px 25px",
                boxShadow: "0 4px 24px rgba(0, 0, 0, 0.12)",
                border: "1px solid #e5e5e5",
              }}
            >
              {/* Product Title - Mobile Only */}
              <div className="text-center mb-4 lg:hidden">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {heading || "Get Instant Access"}
                </h2>
                <p className="text-base md:text-lg text-gray-600 mt-2">
                  {subheading ||
                    "Start using our product immediately after checkout. No waiting, no delays."}
                </p>
              </div>

              <div className="mb-6 lg:hidden">
                <SocialProofBanner
                  avatars={[]}
                  userCount={socialProofConfig.userCount}
                  starRating={socialProofConfig.starRating}
                />
              </div>

              {/* Pricing */}
              {showPriceDetails && (
                <div className="text-center mb-4">
                  {originalPrice && (
                    <div
                      className="line-through mb-1 text-2xl sm:text-3xl"
                      style={{
                        color: "#9ca3af",
                        fontWeight: "400",
                        fontFamily:
                          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
                      }}
                    >
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
                    <div
                      className="mt-2"
                      style={{
                        color: "#6b7280",
                        fontSize: "14px",
                        fontStyle: "italic",
                      }}
                    >
                      {priceLabel}
                    </div>
                  )}
                </div>
              )}

              {/* Discount Badge */}
              {discountPercentage > 0 && (
                <div className="mb-5 mx-auto w-full">
                  <div
                    className="py-2.5 px-4 rounded-md text-center font-bold"
                    style={{
                      backgroundColor: "#ef4444",
                      color: "white",
                      fontSize: "13px",
                      letterSpacing: "0.01em",
                    }}
                  >
                    {discountPercentage}% OFF - but only TODAY, on THURSDAY
                  </div>
                </div>
              )}

              <div
                style={{
                  borderTop: "1px solid #e5e7eb",
                  marginBottom: "20px",
                  marginTop: "15px",
                }}
              ></div>

              {/* Benefits List */}
              <div className="mb-6">
                <div className="space-y-2.5">
                  {listItems.map((feat, index) => (
                    <div key={index} className="flex items-center gap-2.5">
                      <span
                        className="flex items-center justify-center rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: "#dcfce7",
                          width: "20px",
                          height: "20px",
                        }}
                      >
                        <Check
                          style={{
                            color: "#16a34a",
                            width: "12px",
                            height: "12px",
                            strokeWidth: "3",
                          }}
                        />
                      </span>
                      <span
                        style={{
                          color: "#374151",
                          fontSize: "15px",
                          fontFamily:
                            "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
                          lineHeight: "1.4",
                        }}
                      >
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{ borderTop: "1px solid #e5e7eb", marginBottom: "20px" }}
              ></div>

              {/* Additional info if provided */}
              {(benefits?.length || features?.length) &&
                benefits?.length !== listItems.length && (
                  <div className="mb-4">
                    <p
                      className="text-left mb-3"
                      style={{
                        color: "#374151",
                        fontSize: "14px",
                        lineHeight: "1.5",
                      }}
                    >
                      Included:{" "}
                      <strong>300 critical conversion checkpoints</strong>
                    </p>
                    <p
                      className="text-left mb-4"
                      style={{
                        color: "#374151",
                        fontSize: "14px",
                        lineHeight: "1.5",
                      }}
                    >
                      Checklist last updated: <strong>October 2nd 2025</strong>
                    </p>
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
                <div
                  className="text-center leading-relaxed"
                  style={{
                    color: "#6b7280",
                    fontSize: "13px",
                    lineHeight: "1.5",
                    fontFamily:
                      "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
                  }}
                >
                  {terms}
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
