import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";

import { canonicalizeStoreOrigin } from "@/lib/canonical-url";
import type { SiteConfig } from "@/lib/site-config";
import type { ProductData } from "@/lib/products/product-schema";
import {
  buildFaqEntries,
  buildPermissionEntries,
  buildProductCopy,
  buildProductMetadata,
  buildReviewEntries,
} from "@/lib/products/view-model";
import { productToHomeTemplate } from "@/lib/products/product-adapter";
import { useProductPageExperience } from "@/components/product/hooks/useProductPageExperience";
import { getBrandLogoPath } from "@/lib/products/brand-logos";
import type { ResolvedHomeCta } from "@/components/product/landers/default/home-template.types";
import type { MetadataRow, LegalLink } from "./MarketplaceMetadataList";
import { buildMetadataRows } from "./MarketplaceMetadataList";

export type MarketplaceProductPageViewModel = {
  structuredData: {
    product: ProductData;
    url: string;
  };
  waitlistModal: {
    isOpen: boolean;
    onClose: () => void;
  };
  layout: {
    header: {
      name: string;
      subtitle: string;
      categories: string[];
      iconUrl: string | null;
      iconInitials: string;
      onPrimaryAction: () => void;
      primaryLabel: string;
    };
    footerSite: {
      name: string;
      url: string;
    };
  };
  stickyBar: {
    show: boolean;
    product: ProductData;
    productName: string;
    priceLabel: string | null;
    price: string | null;
    originalPrice: string | null;
    brandLogoPath: string | null;
    mainImageSource?: string | null;
    waitlistEnabled: boolean;
    onWaitlistClick: () => void;
    checkoutCta: ResolvedHomeCta | null;
    onCheckoutClick: (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
  };
  metadata: {
    rows: MetadataRow[];
    legalLinks: LegalLink[];
  };
  sections: {
    features: {
      imageUrl: string | null;
      caption: string;
      title: string;
      description: string;
    };
    about: {
      body: string[];
    } | null;
    faqItems: ReturnType<typeof buildFaqEntries>;
    reviewItems: ReturnType<typeof buildReviewEntries>;
    permissionItems: Array<{
      id: string;
      title: string;
      description: string;
      learnMoreUrl?: string;
    }>;
  };
  waitlistEnabled: boolean;
};

export function useMarketplaceProductPageViewModel(
  product: ProductData,
  siteConfig: SiteConfig,
): MarketplaceProductPageViewModel {
  const homeTemplate = useMemo(() => productToHomeTemplate(product, []), [product]);

  const { resolvedCta, handleCtaClick, waitlist } = useProductPageExperience(
    product,
    {
      cta: homeTemplate.cta,
      ctaMode: homeTemplate.ctaMode,
      ctaHref: homeTemplate.ctaHref,
      ctaText: homeTemplate.ctaText,
      ctaTarget: homeTemplate.ctaTarget,
      ctaRel: homeTemplate.ctaRel,
      ctaOpensInNewTab: homeTemplate.ctaOpensInNewTab,
    },
    { analytics: false },
  );

  const showStickyBar = useStickyBarVisibility(600);

  const copy = useMemo(() => buildProductCopy(product), [product]);
  const metadata = useMemo(() => buildProductMetadata(product), [product]);
  const metadataRows = useMemo(() => buildMetadataRows(metadata), [metadata]);
  const permissionEntries = useMemo(() => buildPermissionEntries(product), [product]);
  const faqItems = useMemo(() => buildFaqEntries(product), [product]);
  const reviewItems = useMemo(() => buildReviewEntries(product), [product]);

  const canonicalBaseUrl = useMemo(
    () =>
      canonicalizeStoreOrigin(
        typeof window !== "undefined" ? window.location.origin : siteConfig?.site?.domain,
      ),
    [siteConfig],
  );
  const normalizedSlug = product.slug?.replace(/^\/+/, "") ?? "";
  const productUrl = normalizedSlug ? `${canonicalBaseUrl}/${normalizedSlug}` : canonicalBaseUrl;

  const footerSite = useMemo(() => {
    const rawName = siteConfig.site?.name ?? "SERP";
    const normalizedName = rawName.replace(/\bApps\b/gi, "").trim() || "SERP";
    return { name: normalizedName, url: "https://serp.co" };
  }, [siteConfig]);

  const waitlistEnabled = product.status === "pre_release";
  const brandLogoPath = getBrandLogoPath(product.slug ?? "");
  const stickyImageSource = brandLogoPath || product.featured_image || null;

  const primaryButtonLabel = resolvePrimaryButtonLabel({
    resolvedCta,
    pricingCtaText: product.pricing?.cta_text,
    waitlistEnabled,
  });

  const handleHeroClick = useCallback(() => handleCtaClick("hero"), [handleCtaClick]);

  const handleCheckoutClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      event.preventDefault();
      handleCtaClick("sticky_bar");
    },
    [handleCtaClick],
  );

  const hasAboutContent = copy.aboutParagraphs.some((paragraph) => paragraph.trim().length > 0);

  return {
    structuredData: {
      product,
      url: productUrl,
    },
    waitlistModal: {
      isOpen: waitlist.isOpen,
      onClose: waitlist.close,
    },
    layout: {
      header: {
        name: product.name ?? product.platform ?? "Marketplace app",
        subtitle: copy.subtitle,
        categories: metadata.categories,
        iconUrl: brandLogoPath || null,
        iconInitials: getInitials(product.platform ?? product.name),
        onPrimaryAction: handleHeroClick,
        primaryLabel: primaryButtonLabel,
      },
      footerSite,
    },
    stickyBar: {
      show: showStickyBar,
      product,
      productName: product.name ?? "Product",
      priceLabel: null,
      price: product.pricing?.price ?? null,
      originalPrice: product.pricing?.original_price ?? null,
      brandLogoPath: brandLogoPath ?? null,
      mainImageSource: stickyImageSource,
      waitlistEnabled,
      onWaitlistClick: waitlist.open,
      checkoutCta: resolvedCta,
      onCheckoutClick: handleCheckoutClick,
    },
    metadata: {
      rows: metadataRows,
      legalLinks: [],
    },
    sections: {
      features: {
        imageUrl: product.featured_image ?? product.screenshots?.[0]?.url ?? null,
        caption: product.screenshots?.[0]?.caption ?? product.tagline ?? product.name ?? "",
        title: copy.featuresTitle,
        description: copy.featuresDescription,
      },
      about: hasAboutContent ? { body: copy.aboutParagraphs } : null,
      faqItems,
      reviewItems,
      permissionItems: permissionEntries.map((entry) => ({
        id: entry.id,
        title: entry.question,
        description: entry.answer,
        learnMoreUrl: entry.learnMoreUrl,
      })),
    },
    waitlistEnabled,
  };
}

function useStickyBarVisibility(threshold: number): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > threshold);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  return visible;
}

function resolvePrimaryButtonLabel({
  resolvedCta,
  pricingCtaText,
  waitlistEnabled,
}: {
  resolvedCta: ResolvedHomeCta | null;
  pricingCtaText?: string | null;
  waitlistEnabled: boolean;
}): string {
  const fromResolved = resolvedCta?.text?.trim();
  if (fromResolved && fromResolved.length > 0) {
    return fromResolved;
  }

  const fromPricing = pricingCtaText?.trim();
  if (fromPricing && fromPricing.length > 0) {
    return fromPricing;
  }

  return waitlistEnabled ? "Get Notified" : "Install app";
}

function getInitials(value: string | undefined) {
  if (!value) {
    return "A";
  }
  const words = value.trim().split(/\s+/).filter(word => word.length > 0);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  if (words.length >= 2 && words[1]) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return words[0].slice(0, 2).toUpperCase();
}
