import { useCallback, useMemo } from "react";

import type { HomeCtaMode, ResolvedHomeCta } from "@/components/home/home-template.types";
import type { ProductData } from "@/lib/products/product-schema";
import { ensureResolvedHomeCta } from "@/lib/products/home-cta";
import { trackProductCheckoutClick } from "@/lib/analytics/product";

type Placement = "pricing" | "sticky_bar" | "hero" | "unknown";

type HomeCtaSource = {
  cta?: ResolvedHomeCta | null;
  ctaMode?: HomeCtaMode | null;
  ctaHref?: string | null;
  ctaText?: string | null;
  ctaTarget?: "_self" | "_blank" | null;
  ctaRel?: string | null;
  ctaOpensInNewTab?: boolean | null;
};

export type UseProductCheckoutCtaOptions = {
  product: ProductData;
  homeCta: HomeCtaSource;
  affiliateId?: string | null;
  onShowWaitlist?: () => void;
};

export function useProductCheckoutCta({
  product,
  homeCta,
  affiliateId = null,
  onShowWaitlist,
}: UseProductCheckoutCtaOptions) {
  const resolvedCta = useMemo(
    () =>
      ensureResolvedHomeCta(product, {
        cta: homeCta.cta,
        ctaMode: homeCta.ctaMode,
        ctaHref: homeCta.ctaHref,
        ctaText: homeCta.ctaText,
        ctaTarget: homeCta.ctaTarget,
        ctaRel: homeCta.ctaRel,
        ctaOpensInNewTab: homeCta.ctaOpensInNewTab,
      }),
    [
      homeCta.cta,
      homeCta.ctaHref,
      homeCta.ctaMode,
      homeCta.ctaOpensInNewTab,
      homeCta.ctaRel,
      homeCta.ctaTarget,
      homeCta.ctaText,
      product,
    ],
  );

  const analyticsDestination = resolvedCta.analytics?.destination ?? "external";
  const paymentLinkDetails = resolvedCta.analytics?.paymentLink;

  const navigateToCta = useCallback(() => {
    if (resolvedCta.mode === "pre_release") {
      onShowWaitlist?.();
      return;
    }

    if (resolvedCta.opensInNewTab) {
      window.open(resolvedCta.href, resolvedCta.target, "noopener,noreferrer");
    } else {
      window.location.assign(resolvedCta.href);
    }
  }, [onShowWaitlist, resolvedCta]);

  const handleCtaClick = useCallback(
    (placement: Placement) => {
      trackProductCheckoutClick(product, {
        placement,
        destination: analyticsDestination,
        affiliateId,
        paymentLinkProvider: paymentLinkDetails?.provider ?? null,
        paymentLinkVariant: paymentLinkDetails?.variant ?? null,
        paymentLinkId: paymentLinkDetails?.linkId ?? null,
        paymentLinkUrl: paymentLinkDetails?.url ?? null,
      });

      navigateToCta();
    },
    [affiliateId, analyticsDestination, navigateToCta, paymentLinkDetails, product],
  );

  return {
    cta: resolvedCta,
    analyticsDestination,
    paymentLinkDetails,
    handleCtaClick,
    navigateToCta,
  };
}
