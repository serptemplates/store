"use client";

import { Fragment, useMemo, useState, useCallback, useEffect, type ReactNode } from "react";

import { Footer as FooterComposite } from "@repo/ui/composites/Footer";
import { canonicalizeStoreOrigin } from "@/lib/canonical-url";
import type { ProductData } from "@/lib/products/product-schema";
import type { SiteConfig } from "@/lib/site-config";

import { ProductStructuredDataScripts } from "@/components/product/ProductStructuredDataScripts";
import { ProductStructuredData } from "@/schema/structured-data-components";
import { useAffiliateTracking } from "@/components/product/useAffiliateTracking";
import { productToHomeTemplate } from "@/lib/products/product-adapter";
import { useProductCheckoutCta } from "@/components/product/useProductCheckoutCta";
import { GhlWaitlistModal } from "@/components/waitlist/GhlWaitlistModal";

import { MarketplaceLayout } from "@/components/product/layouts/MarketplaceLayout";
import { AppHeader } from "@/components/product/marketplace/AppHeader";
import { FeaturesBanner } from "@/components/product/marketplace/FeaturesBanner";
import { AboutBlock } from "@/components/product/marketplace/AboutBlock";
import { FaqAccordion, type FaqItem } from "@/components/product/marketplace/FaqAccordion";
import { ReviewsList, type ReviewListItem } from "@/components/product/marketplace/ReviewsList";
import { StickyPurchaseBar } from "@/components/product/StickyPurchaseBar";
import { ExternalLink } from "lucide-react";
import { getBrandLogoPath } from "@/lib/products/brand-logos";

export type MarketplaceProductPageViewProps = {
  product: ProductData;
  siteConfig: SiteConfig;
};

type MetadataRow = {
  label: string;
  value: ReactNode;
};

const SECTION_LABEL_CLASS =
  "mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6b7a90] lg:mb-0";

export function MarketplaceProductPageView({ product, siteConfig }: MarketplaceProductPageViewProps) {
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const { affiliateId } = useAffiliateTracking();
  const homeTemplate = useMemo(() => productToHomeTemplate(product, []), [product]);

  const { cta: resolvedCta, handleCtaClick } = useProductCheckoutCta({
    product,
    homeCta: {
      cta: homeTemplate.cta,
      ctaMode: homeTemplate.ctaMode,
      ctaHref: homeTemplate.ctaHref,
      ctaText: homeTemplate.ctaText,
      ctaTarget: homeTemplate.ctaTarget,
      ctaRel: homeTemplate.ctaRel,
      ctaOpensInNewTab: homeTemplate.ctaOpensInNewTab,
    },
    affiliateId,
    onShowWaitlist: () => setShowWaitlistModal(true),
  });

  const copy = buildMarketplaceCopy(product);

  const canonicalBaseUrl = canonicalizeStoreOrigin(
    typeof window !== "undefined" ? window.location.origin : undefined,
  );
  const normalizedSlug = product.slug?.replace(/^\/+/, "") ?? "";
  const productUrl = normalizedSlug ? `${canonicalBaseUrl}/${normalizedSlug}` : canonicalBaseUrl;

  const footerSite = useMemo(() => {
    const rawName = siteConfig.site?.name ?? "SERP";
    const normalizedName = rawName.replace(/\bApps\b/gi, "").trim() || "SERP";
    return { name: normalizedName, url: "https://serp.co" };
  }, [siteConfig]);

  const metadataRows = buildMetadataRows(product);

  const permissionJustifications = buildPermissionJustificationFaqItems(product);
  const faqItems = buildFaqItems(product);
  const reviewItems = buildReviewItems(product);
  const featuredImage = product.featured_image ?? product.screenshots?.[0]?.url ?? null;
  const featureCaption =
    product.screenshots?.[0]?.caption ??
    product.tagline ??
    product.name ??
    "";
  const categories =
    product.categories
      ?.map((category) => category.trim())
      .filter((category) => category.length > 0) ?? [];
  const waitlistEnabled = product.status === "pre_release";
  const brandLogoPath = getBrandLogoPath(product.slug ?? "");
  const primaryButtonLabel = (() => {
    const fromResolved = resolvedCta.text?.trim();
    if (fromResolved && fromResolved.length > 0) {
      return fromResolved;
    }
    const fromPricing = product.pricing?.cta_text?.trim();
    if (fromPricing && fromPricing.length > 0) {
      return fromPricing;
    }
    return waitlistEnabled ? "Get Notified" : "Install app";
  })();
  const handleHeroClick = useCallback(() => handleCtaClick("hero"), [handleCtaClick]);
  const handleStickyBarCheckoutClick = useCallback(() => handleCtaClick("sticky_bar"), [handleCtaClick]);
  const hasAboutContent = copy.aboutParagraphs.some((paragraph) => paragraph.trim().length > 0);
  const stickyImageSource = brandLogoPath || product.featured_image || undefined;

  useEffect(() => {
    const handleScroll = () => {
      const triggerHeight = 600;
      setShowStickyBar(window.scrollY > triggerHeight);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <ProductStructuredDataScripts product={product} posts={[]} siteConfig={siteConfig} images={[]} videoEntries={[]} />
      <ProductStructuredData product={product} url={productUrl} />
      <GhlWaitlistModal open={showWaitlistModal} onClose={() => setShowWaitlistModal(false)} />

      <MarketplaceLayout
        header={
          <AppHeader
            name={product.name ?? product.platform ?? "Marketplace app"}
            subtitle={copy.subtitle}
            categories={categories}
            iconUrl={brandLogoPath || null}
            iconInitials={getInitials(product.platform ?? product.name)}
            onPrimaryAction={handleHeroClick}
            primaryLabel={primaryButtonLabel}
          />
        }
        footer={<FooterComposite site={footerSite} />}
      >
        <StickyPurchaseBar
          product={product}
          priceLabel={null}
          price={product.pricing?.price ?? null}
          originalPrice={product.pricing?.original_price ?? null}
          show={showStickyBar}
          brandLogoPath={brandLogoPath ?? undefined}
          mainImageSource={stickyImageSource}
          waitlistEnabled={waitlistEnabled}
          onWaitlistClick={() => setShowWaitlistModal(true)}
          checkoutCta={resolvedCta}
          onCheckoutClick={(event) => {
            event.preventDefault();
            handleStickyBarCheckoutClick();
          }}
        />

        <div className="mt-12 grid gap-y-12 lg:grid-cols-12 lg:gap-x-10">
          <aside className="hidden space-y-8 text-[14px] leading-[1.6] text-[#334155] md:flex md:flex-col lg:col-span-4">
            <MetadataList items={metadataRows} legalLinks={[]} />
          </aside>
          <section className="lg:col-span-8 space-y-12">
            <FeaturesBanner
              imageUrl={featuredImage}
              caption={featureCaption}
              title={copy.featuresTitle}
              description={copy.featuresDescription}
            />
          </section>

          {hasAboutContent ? (
            <>
              <div className="lg:col-span-12">
                <Divider />
              </div>
              <aside className="lg:col-span-4">
                <span className={SECTION_LABEL_CLASS}>About</span>
              </aside>
              <section className="lg:col-span-8 space-y-12">
                <AboutBlock body={copy.aboutParagraphs} />
              </section>
            </>
          ) : null}

          {faqItems.length > 0 ? (
            <>
              <div className="lg:col-span-12">
                <Divider />
              </div>
              <aside className="lg:col-span-4">
                <span className={SECTION_LABEL_CLASS}>FAQs</span>
              </aside>
              <section className="lg:col-span-8">
                <FaqAccordion items={faqItems} />
              </section>
            </>
          ) : null}

          {reviewItems.length > 0 ? (
            <>
              <div className="lg:col-span-12">
                <Divider />
              </div>
              <aside className="lg:col-span-4">
                <span className={SECTION_LABEL_CLASS}>Reviews</span>
              </aside>
              <section className="lg:col-span-8">
                <ReviewsList reviews={reviewItems} />
              </section>
            </>
          ) : null}

          {permissionJustifications.length > 0 ? (
            <>
              <div className="lg:col-span-12">
                <Divider />
              </div>
              <aside className="lg:col-span-4">
                <span className={SECTION_LABEL_CLASS}>Permissions</span>
              </aside>
              <section className="lg:col-span-8">
                <FaqAccordion items={permissionJustifications} />
              </section>
            </>
          ) : null}
        </div>
      </MarketplaceLayout>
    </>
  );
}

function buildMetadataRows(product: ProductData): MetadataRow[] {
  const supportedLanguages = getSupportedLanguages(product);
  const metadata: MetadataRow[] = [];
  const compatibilityLabel = "Compatibility";

  if (supportedLanguages.length > 0) {
    metadata.push({
      label: "Supported languages",
      value: supportedLanguages.join(", "),
    });
  }

  if (product.supported_operating_systems && product.supported_operating_systems.length > 0) {
    const systems = product.supported_operating_systems.filter((system) => system.trim().length > 0);
    if (systems.length > 0) {
      const normalizedSystems = systems.map((system) => formatPlatformLabel(system));
      const rows = chunkIntoLines(normalizedSystems, 2);
      if (rows.length > 0) {
        metadata.push({
          label: compatibilityLabel,
          value: (
            <div className="flex flex-col gap-1">
              {rows.map((line, index) => (
                <span key={`${line}-${index}`} className="text-[14px] leading-[1.6] text-[#334155]">
                  {line}
                </span>
              ))}
            </div>
          ),
        });
      }
    }
  }

  const resourceLinks: Array<{ label: string; href: string }> = [];
  if (product.serp_co_product_page_url) {
    resourceLinks.push({ label: "SERP.co", href: product.serp_co_product_page_url });
  }

  const externalLinkCandidates: Array<{ href?: string | null; label: string }> = [
    { href: product.chrome_webstore_link, label: "Chrome Web Store" },
    { href: product.firefox_addon_store_link, label: "Firefox Add-ons" },
    { href: product.edge_addons_store_link, label: "Microsoft Edge Add-ons" },
    { href: product.opera_addons_store_link, label: "Opera Add-ons" },
    { href: product.producthunt_link, label: "Product Hunt" },
  ];

  externalLinkCandidates.forEach((candidate) => {
    const href = typeof candidate.href === "string" ? candidate.href.trim() : "";
    if (href.length > 0) {
      resourceLinks.push({ label: candidate.label, href });
    }
  });

  if (resourceLinks.length > 0) {
    metadata.push({
      label: "Links",
      value: (
        <div className="flex flex-col gap-1">
          {resourceLinks.map((link) => (
            <RailLink key={link.href} href={link.href} label={link.label} />
          ))}
        </div>
      ),
    });
  }

  return metadata;
}

function buildMarketplaceCopy(product: ProductData) {
  const appName = product.name ?? product.platform ?? "This app";
  const rawDescription = typeof product.description === "string" ? product.description.trim() : "";
  const descriptionParagraphs = rawDescription.length > 0 ? rawDescription.split(/\n\s*\n/) : [];
  const tagline = typeof product.tagline === "string" ? product.tagline.trim() : "";
  const seoDescription = typeof product.seo_description === "string" ? product.seo_description.trim() : "";

  const subtitle = tagline || descriptionParagraphs[0] || seoDescription || appName;

  const featuresTitle = tagline || appName;
  const featuresDescription = descriptionParagraphs[0] || tagline || seoDescription || appName;

  const aboutParagraphs = descriptionParagraphs.slice(1).filter((paragraph) => paragraph.trim().length > 0);

  return {
    subtitle,
    featuresTitle,
    featuresDescription,
    aboutParagraphs,
  };
}

function buildPermissionJustificationFaqItems(product: ProductData): FaqItem[] {
  return (
    product.permission_justifications
      ?.filter((entry) => {
        const permission = entry.permission?.trim();
        const justification = entry.justification?.trim();
        return Boolean(permission && justification);
      })
      .map((entry, index) => {
        const permission = entry.permission?.trim() ?? "";
        const justification = entry.justification?.trim() ?? "";
        const learnMore = entry.learn_more_url?.trim();
        const answer = learnMore ? `${justification}\n\nLearn more: ${learnMore}` : justification;

        return {
          id: `${permission}-${index}`,
          question: permission,
          answer,
        };
      }) ?? []
  );
}

function buildFaqItems(product: ProductData): FaqItem[] {
  return (
    product.faqs
      ?.filter((faq) => faq.question && faq.answer)
      .map((faq, index) => ({
        id: `${faq.question}-${index}`,
        question: faq.question,
        answer: faq.answer,
      })) ?? []
  );
}

function buildReviewItems(product: ProductData): ReviewListItem[] {
  return (
    product.reviews
      ?.filter((review) => review.name && review.review)
      .map((review, index) => ({
        id: `${review.name}-${index}`,
        name: review.name,
        title: review.title,
        rating: review.rating,
        date: review.date,
        review: review.review,
      })) ?? []
  );
}

function chunkIntoLines(values: string[], perLine: number): string[] {
  const lines: string[] = [];
  for (let index = 0; index < values.length; index += perLine) {
    const slice = values.slice(index, index + perLine);
    lines.push(slice.join(", "));
  }
  return lines;
}

function formatPlatformLabel(value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return normalized;
  }

  const lower = normalized.toLowerCase();
  const overrides: Record<string, string> = {
    ios: "iOS",
    macos: "macOS",
    windows: "Windows",
    mac: "Mac",
    linux: "Linux",
    android: "Android",
    chrome: "Chrome",
    firefox: "Firefox",
    edge: "Edge",
    opera: "Opera",
  };

  if (overrides[lower]) {
    return overrides[lower];
  }

  return normalized
    .split(/[\s_-]+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function getInitials(value: string | undefined) {
  if (!value) return "A";
  const words = value.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

type LegalLink = {
  label: string;
  href: string;
};

type MetadataListProps = {
  items: MetadataRow[];
  legalLinks: LegalLink[];
};

function MetadataList({ items, legalLinks }: MetadataListProps) {
  const hasItems = items.length > 0;
  const hasLegalLinks = legalLinks.length > 0;

  return (
    <div className="space-y-6">
      {hasItems ? (
        <dl className="space-y-6">
          {items.map((item) => (
            <div key={item.label} className="flex flex-col gap-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6b7a90]">{item.label}</dt>
              <dd className="text-[14px] leading-[1.6] text-[#334155]">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {hasItems && hasLegalLinks ? <hr className="border-[#e6e8eb]" /> : null}

      {hasLegalLinks ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[12px] font-medium text-[#635bff]">
          {legalLinks.map((link, index) => (
            <Fragment key={link.label}>
              {index > 0 && <span className="text-[#6b7a90]">/</span>}
              <a href={link.href} target="_blank" rel="noreferrer" className="hover:underline">
                {link.label}
              </a>
            </Fragment>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function getSupportedLanguages(product: ProductData): string[] {
  const maybe = (product as { supported_languages?: unknown }).supported_languages;
  if (!Array.isArray(maybe)) {
    return [];
  }

  const languages = maybe
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);

  return languages;
}

type RailLinkProps = {
  href: string;
  label: string;
};

function RailLink({ href, label }: RailLinkProps) {
  return (
    <a className="inline-flex items-center gap-1 text-[#635bff] hover:underline" href={href} target="_blank" rel="noreferrer">
      {label}
      <ExternalLink className="h-3 w-3 text-[#94a3b8]" aria-hidden="true" />
    </a>
  );
}
function Divider() {
  return <div className="h-12 border-b border-[#e6e8eb]" />;
}
