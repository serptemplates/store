"use client";

import type { ReactNode } from "react";
import { Check, Zap, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@repo/ui";
import { cn } from "@repo/ui/lib/utils";

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
  "Automated backups",
  "24/7 support",
  "Unlimited projects",
  "Unlimited users",
  "Custom domain",
  "Custom branding",
  "Advanced analytics",
  "Custom permissions",
  "Advanced reports",
];

export function PricingCta({
  heading = "Get it Now",
  subheading = "Download videos instantly with zero friction.",
  priceLabel,
  price,
  originalPrice,
  priceNote,
  ctaText = "Get it Now",
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
  const listItems = (benefits?.length ? benefits : features?.length ? features : defaultBenefits).slice(0, 6);

  const showPriceDetails = Boolean(price || priceLabel || originalPrice || priceNote);

  return (
    <section
      id={id}
      className={cn("py-28 px-4 sm:px-8 lg:px-12 bg-muted/60", className)}
    >
      <div className="relative mx-auto max-w-5xl">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight text-foreground">
              {heading}
            </h2>
            <p className="mt-6 max-w-xl text-sm">{subheading}</p>
            <div className="mt-10">
              <div className="flex flex-col gap-4">
                {onCtaClick ? (
                  <Button
                    type="button"
                    size="lg"
                    onClick={onCtaClick}
                    disabled={ctaDisabled || ctaLoading}
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#635BFF] hover:bg-[#5046E5] text-base font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-70"
                  >
                    {ctaLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M5.5 5.5C5.5 4.11929 6.61929 3 8 3H16C17.3807 3 18.5 4.11929 18.5 5.5V18.5C18.5 19.8807 17.3807 21 16 21H8C6.61929 21 5.5 19.8807 5.5 18.5V5.5ZM8 5C7.72386 5 7.5 5.22386 7.5 5.5V18.5C7.5 18.7761 7.72386 19 8 19H16C16.2761 19 16.5 18.7761 16.5 18.5V5.5C16.5 5.22386 16.2761 5 16 5H8Z" fill="currentColor"/>
                        <path d="M11 9.5C11 9.22386 11.2239 9 11.5 9H15.5C15.7761 9 16 9.22386 16 9.5C16 9.77614 15.7761 10 15.5 10H11.5C11.2239 10 11 9.77614 11 9.5Z" fill="currentColor"/>
                        <path d="M11 12C11 11.7239 11.2239 11.5 11.5 11.5H15.5C15.7761 11.5 16 11.7239 16 12C16 12.2761 15.7761 12.5 15.5 12.5H11.5C11.2239 12.5 11 12.2761 11 12Z" fill="currentColor"/>
                      </svg>
                    )}
                    {ctaLoading ? "Processing..." : ctaText}
                    <ArrowRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                ) : (
                  <Button
                    asChild
                    size="lg"
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#635BFF] hover:bg-[#5046E5] text-base font-semibold text-white shadow-lg transition-all hover:shadow-xl"
                  >
                    <a href={ctaHref} target="_blank" rel="noopener noreferrer">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M5.5 5.5C5.5 4.11929 6.61929 3 8 3H16C17.3807 3 18.5 4.11929 18.5 5.5V18.5C18.5 19.8807 17.3807 21 16 21H8C6.61929 21 5.5 19.8807 5.5 18.5V5.5ZM8 5C7.72386 5 7.5 5.22386 7.5 5.5V18.5C7.5 18.7761 7.72386 19 8 19H16C16.2761 19 16.5 18.7761 16.5 18.5V5.5C16.5 5.22386 16.2761 5 16 5H8Z" fill="currentColor"/>
                        <path d="M11 9.5C11 9.22386 11.2239 9 11.5 9H15.5C15.7761 9 16 9.22386 16 9.5C16 9.77614 15.7761 10 15.5 10H11.5C11.2239 10 11 9.77614 11 9.5Z" fill="currentColor"/>
                        <path d="M11 12C11 11.7239 11.2239 11.5 11.5 11.5H15.5C15.7761 11.5 16 11.7239 16 12C16 12.2761 15.7761 12.5 15.5 12.5H11.5C11.2239 12.5 11 12.2761 11 12Z" fill="currentColor"/>
                      </svg>
                      {ctaText}
                      <ArrowRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </a>
                  </Button>
                )}
                {ctaExtra}
              </div>
            </div>
            {terms && <div className="mt-6 text-sm text-muted-foreground">{terms}</div>}
          </div>

          <div className="relative">
            <div className="relative flex flex-col gap-6 rounded-2xl border border-border/70 bg-card/80 p-8 shadow-xl">
              {showPriceDetails ? (
                <div className="text-center">
                  <div className="flex flex-col items-center justify-center gap-1">
                    {originalPrice && (
                      <div className="text-2xl font-medium text-muted-foreground/80 line-through">
                        {originalPrice}
                      </div>
                    )}
                    {price && <div className="text-5xl font-bold text-foreground">{price}</div>}
                  </div>
                  {priceLabel && (
                    <div className="mt-1 text-sm uppercase tracking-wide text-muted-foreground">{priceLabel}</div>
                  )}
                  {priceNote && <div className="mt-2 text-sm text-muted-foreground">{priceNote}</div>}
                </div>
              ) : null}

              <div className="space-y-4">
                {listItems.map((feat, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm text-foreground">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PricingCta;
