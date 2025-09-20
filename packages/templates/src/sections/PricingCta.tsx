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
      <div className="relative mx-auto max-w-6xl">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight text-foreground">
              {heading}
            </h2>
            <p className="mt-6 max-w-xl text-sm">{subheading}</p>
            <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              {onCtaClick ? (
                <Button
                  type="button"
                  size="lg"
                  onClick={onCtaClick}
                  disabled={ctaDisabled || ctaLoading}
                  className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary/80 px-7 py-6 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:from-primary/90 hover:to-primary/70 hover:shadow-xl disabled:opacity-70"
                >
                  {ctaLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Zap className="h-5 w-5" />
                  )}
                  {ctaLoading ? "Processing..." : ctaText}
                  <ArrowRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              ) : (
                <Button
                  asChild
                  size="lg"
                  className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary/80 px-7 py-6 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:from-primary/90 hover:to-primary/70 hover:shadow-xl"
                >
                  <a href={ctaHref} target="_blank" rel="noopener noreferrer">
                    <Zap className="h-5 w-5" />
                    {ctaText}
                    <ArrowRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </a>
                </Button>
              )}
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
