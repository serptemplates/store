import { useCallback, useMemo } from "react";

import type { HomeCtaMode, ResolvedHomeCta } from "@/components/product/landers/default/home-template.types";
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

  const normalizeNavigationHref = useCallback((rawHref?: string | null): string | null => {
    if (!rawHref) {
      return null;
    }

    if (rawHref.startsWith("#") || rawHref.startsWith("/")) {
      return rawHref;
    }

    if (typeof window === "undefined") {
      return rawHref;
    }

    try {
      const candidateUrl = new URL(rawHref, window.location.origin);
      const internalHosts = new Set([
        window.location.hostname,
        "localhost",
        "127.0.0.1",
        "apps.serp.co",
      ]);

      if (internalHosts.has(candidateUrl.hostname)) {
        return `${candidateUrl.pathname}${candidateUrl.search}${candidateUrl.hash}`;
      }

      return candidateUrl.toString();
    } catch {
      return rawHref;
    }
  }, []);

  const navigateToCta = useCallback(() => {
    if (resolvedCta.mode === "pre_release") {
      onShowWaitlist?.();
      return;
    }

    const normalizedHref = normalizeNavigationHref(resolvedCta.href);
    if (!normalizedHref) {
      return;
    }

    if (resolvedCta.opensInNewTab) {
      const absoluteHref =
        normalizedHref.startsWith("http") || normalizedHref.startsWith("//")
          ? normalizedHref
          : `${window.location.origin}${normalizedHref}`;
      window.open(absoluteHref, resolvedCta.target, "noopener,noreferrer");
    } else {
      window.location.assign(normalizedHref);
    }
  }, [normalizeNavigationHref, onShowWaitlist, resolvedCta]);

  const handleCtaClick = useCallback(
    (placement: Placement) => {
      trackProductCheckoutClick(product, {
        placement,
        destination: analyticsDestination,
        affiliateId,
      });

      navigateToCta();
    },
    [affiliateId, analyticsDestination, navigateToCta, product],
  );

  return {
    cta: resolvedCta,
    analyticsDestination,
    handleCtaClick,
    navigateToCta,
  };
}
