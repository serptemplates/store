import { useCallback, useEffect, useMemo, useState } from "react";

import type { HomeCtaMode, ResolvedHomeCta } from "@/components/product/landers/default/home-template.types";
import { useAffiliateTracking } from "@/components/product/useAffiliateTracking";
import { useProductCheckoutCta } from "@/components/product/useProductCheckoutCta";
import { trackCheckoutSuccessBanner, trackProductPageView } from "@/lib/analytics/product";
import type { ProductData } from "@/lib/products/product-schema";

type HomeCtaConfig = {
  cta?: ResolvedHomeCta | null;
  ctaMode?: HomeCtaMode | null;
  ctaHref?: string | null;
  ctaText?: string | null;
  ctaTarget?: "_self" | "_blank" | null;
  ctaRel?: string | null;
  ctaOpensInNewTab?: boolean | null;
};

export type ProductPageExperience = {
  affiliateId: string | null | undefined;
  checkoutSuccess: boolean;
  resolvedCta: ResolvedHomeCta;
  handleCtaClick: ReturnType<typeof useProductCheckoutCta>["handleCtaClick"];
  navigateToCta: ReturnType<typeof useProductCheckoutCta>["navigateToCta"];
  waitlist: {
    isOpen: boolean;
    open: () => void;
    close: () => void;
  };
};

type UseProductPageExperienceOptions = {
  analytics?: boolean;
};

export function useProductPageExperience(
  product: ProductData,
  homeCta: HomeCtaConfig,
  options: UseProductPageExperienceOptions = {},
): ProductPageExperience {
  const { analytics = true } = options;
  const { affiliateId, checkoutSuccess } = useAffiliateTracking();
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  const { cta, handleCtaClick, navigateToCta } = useProductCheckoutCta({
    product,
    affiliateId,
    homeCta,
    onShowWaitlist: () => setWaitlistOpen(true),
  });

  useEffect(() => {
    if (!analytics) {
      return;
    }
    trackProductPageView(product, { affiliateId });
  }, [analytics, affiliateId, product]);

  useEffect(() => {
    if (!analytics || !checkoutSuccess) {
      return;
    }
    trackCheckoutSuccessBanner(product, { affiliateId });
  }, [analytics, affiliateId, checkoutSuccess, product]);

  const openWaitlist = useCallback(() => setWaitlistOpen(true), []);
  const closeWaitlist = useCallback(() => setWaitlistOpen(false), []);

  const resolvedCta = useMemo(() => cta, [cta]);

  return {
    affiliateId,
    checkoutSuccess,
    resolvedCta,
    handleCtaClick,
    navigateToCta,
    waitlist: {
      isOpen: waitlistOpen,
      open: openWaitlist,
      close: closeWaitlist,
    },
  };
}
