"use client";

import Image from "next/image";
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
import { PermissionsAccordion, type PermissionAccordionItem } from "@/components/product/marketplace/PermissionsAccordion";
import { FaqAccordion, type FaqItem } from "@/components/product/marketplace/FaqAccordion";
import { ReviewsList, type ReviewListItem } from "@/components/product/marketplace/ReviewsList";
import { StickyPurchaseBar } from "@/components/product/StickyPurchaseBar";
import { ExternalLink } from "lucide-react";
import type { BlogPostMeta } from "@/lib/blog";
import type { ProductVideoEntry } from "@/lib/products/video";
import type { PostItem } from "@repo/ui/sections/PostsSection";
import { Badge, Card, CardHeader, CardTitle, CardContent } from "@repo/ui";
import { getBrandLogoPath } from "@/lib/products/brand-logos";

export type VideoCardItem = {
  url: string;
  title: string;
  thumbnail?: string | null;
};

export type RelatedAppItem = {
  slug: string;
  name: string;
  primaryCategory?: string;
};

export type MarketplaceProductPageViewProps = {
  product: ProductData;
  siteConfig: SiteConfig;
  videoEntries?: VideoCardItem[];
  relatedApps?: RelatedAppItem[];
  relatedPosts?: PostItem[];
  schemaPosts?: BlogPostMeta[];
  schemaVideoEntries?: ProductVideoEntry[];
};

type MetadataRow = {
  label: string;
  value: ReactNode;
};

const SECTION_LABEL_CLASS = "hidden lg:block text-[36px] font-black uppercase tracking-[0.08em] text-[#fffff]";

export function MarketplaceProductPageView({ product, siteConfig, videoEntries, relatedApps, relatedPosts = [], schemaPosts = [], schemaVideoEntries = [] }: MarketplaceProductPageViewProps) {
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

  const footerSite = useMemo(
    () => ({ name: siteConfig.site?.name ?? "SERP", url: "https://serp.co" }),
    [siteConfig],
  );

  const metadataRows = buildMetadataRows(product);

  const permissions = buildPermissionItems(product);
  const faqItems = buildFaqItems(product);
  const reviewItems = buildReviewItems(product);
  const featuredImage = product.featured_image ?? product.screenshots?.[0]?.url ?? null;
  const screenshots = (product.screenshots ?? []).filter((shot) => Boolean(shot?.url?.trim()));
  const featureCaption = screenshots[0]?.caption ?? product.tagline ?? product.name ?? "";
  const carouselImages = screenshots.map((shot) => ({
    src: shot.url!,
    alt: shot.alt ?? product.name ?? undefined,
  }));
  const featureList = (product.features ?? [])
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
  const fallbackVideoItems = useMemo(
    () => buildFallbackVideoItems(product, featuredImage ?? undefined),
    [product, featuredImage],
  );
  const relatedVideos = useMemo<VideoCardItem[]>(() => {
    if (videoEntries && videoEntries.length > 0) {
      return videoEntries.map((entry) => ({
        url: entry.url,
        title: entry.title,
        thumbnail: entry.thumbnail ?? featuredImage ?? null,
      }));
    }
    return fallbackVideoItems;
  }, [videoEntries, featuredImage, fallbackVideoItems]);
  const relatedArticles = buildRelatedArticles(product);
  const videoRow = useMemo(() => relatedVideos.slice(0, 3), [relatedVideos]);
  const screenshotRow = useMemo(() => screenshots, [screenshots]);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const primaryButtonLabel = (() => {
    const fromPricing = product.pricing?.cta_text?.trim();
    if (fromPricing && fromPricing.length > 0) return fromPricing;
    const fromResolved = resolvedCta.text?.trim();
    if (fromResolved && fromResolved.length > 0) return fromResolved;
    return "Install app";
  })();
  const handleHeroClick = useCallback(() => handleCtaClick("hero"), [handleCtaClick]);
  const handleStickyBarCheckoutClick = useCallback(() => handleCtaClick("sticky_bar"), [handleCtaClick]);
  const hasAboutContent = copy.aboutParagraphs.some((paragraph) => paragraph.trim().length > 0);
  const waitlistEnabled = product.status === "pre_release";
  const brandLogoPath = getBrandLogoPath(product.slug ?? "");
  const stickyImageSource = brandLogoPath || product.featured_image || undefined;

  useEffect(() => {
    const handleScroll = () => {
      const triggerHeight = 600;
      setShowStickyBar(window.scrollY > triggerHeight);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Structured data inputs: images + videos
  const structuredImages: string[] = [
    ...(featuredImage ? [featuredImage] : []),
    ...screenshots.map((s) => s.url!).filter(Boolean),
  ];
  const structuredVideos: ProductVideoEntry[] = schemaVideoEntries;

  return (
    <>
      <ProductStructuredDataScripts product={product} posts={schemaPosts} siteConfig={siteConfig} images={structuredImages} videoEntries={structuredVideos} />
      <ProductStructuredData product={product} url={productUrl} />
      <GhlWaitlistModal open={showWaitlistModal} onClose={() => setShowWaitlistModal(false)} />

      <MarketplaceLayout
        header={
          <AppHeader
            name={product.name ?? product.platform ?? "Marketplace app"}
            subtitle={copy.subtitle}
            category={product.categories?.find((category) => category.trim().length > 0)}
            iconUrl={brandLogoPath ?? product.featured_image}
            iconInitials={getInitials(product.platform ?? product.name)}
            onPrimaryAction={handleHeroClick}
            primaryLabel={primaryButtonLabel}
          />
        }
        footer={<FooterComposite site={footerSite} />}
      >
        <StickyPurchaseBar
          product={product}
          priceLabel={product.pricing?.label ?? null}
          price={product.pricing?.price ?? null}
          originalPrice={product.pricing?.original_price ?? null}
          show={showStickyBar}
          brandLogoPath={brandLogoPath ?? undefined}
          mainImageSource={stickyImageSource}
          waitlistEnabled={waitlistEnabled}
          onWaitlistClick={() => setShowWaitlistModal(true)}
          checkoutCta={waitlistEnabled ? null : resolvedCta}
          onCheckoutClick={(event) => {
            event.preventDefault();
            handleStickyBarCheckoutClick();
          }}
        />

        <div className="mt-12 grid gap-y-12 lg:grid-cols-12 lg:gap-x-10">
          <div className="lg:col-span-12">
            <nav className="mb-2 text-sm">
              <a href="/" className="text-gray-500 hover:text-gray-700">Home</a>
              <span className="mx-2 text-gray-400">/</span>
              <span className="text-gray-900">{product.name}</span>
            </nav>
          </div>
          <aside className="hidden space-y-6 text-[16px] leading-[1.6] text-[#334155] md:flex md:flex-col lg:col-span-4">
            <MetadataList items={metadataRows} legalLinks={[]} />
          </aside>
          {/* Overview with main video (no carousel) */}
          <section className="lg:col-span-8 space-y-12">
            <FeaturesBanner
              // Prefer video over image; only use image when no video
              imageUrl={relatedVideos.length > 0 ? undefined : (featuredImage || undefined)}
              images={[]}
              videos={relatedVideos.length > 0 ? [relatedVideos[0].url] : []}
              fallbackThumbnail={featuredImage}
              label="Overview"
              caption={featureCaption}
              title={copy.featuresTitle}
              description={copy.featuresDescription}
            />
          </section>




          {screenshotRow.length > 0 ? (
            <>
              <div className="lg:col-span-12">
                <Divider />
              </div>
                              <span className={SECTION_LABEL_CLASS}>Screenshots</span>
              <section className="lg:col-span-12 space-y-6">
                <div
                  className="flex snap-x snap-mandatory gap-6 overflow-x-auto px-1"
                  aria-label="Product screenshots"
                >
                  {screenshotRow.map((shot) => (
                    <button
                      key={shot.url}
                      type="button"
                      onClick={() => setLightboxImageUrl(shot.url)}
                      className="snap-start shrink-0 basis-full sm:basis-1/2 xl:basis-1/3 group flex h-full flex-col overflow-hidden  border border-[#e6e8eb] bg-white text-left transition hover:border-[#bfd0ff] hover:shadow-md"
                    >
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0a2540]">
                        <Image
                          src={shot.url}
                          alt={shot.alt ?? product.name ?? 'Screenshot'}
                          fill
                          className="object-cover transition duration-200 group-hover:scale-[1.02]"
                          sizes="(max-width: 768px) 100vw, (max-width: 1440px) 40vw, 30vw"
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </>
          ) : null}


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
          
          {videoRow.length > 0 ? (
            <>
              <div className="lg:col-span-12">
                <Divider />
              </div>
              <section className="lg:col-span-12 space-y-6">
                <span className={SECTION_LABEL_CLASS}>Videos</span>
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {videoRow.map((video) => (
                    <a
                      key={video.url}
                      href={video.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex h-full flex-col overflow-hidden  bg-white transition hover:border-[#bfd0ff] hover:shadow-md"
                    >
                      {video.thumbnail ? (
                        <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0a2540]">
                          <Image
                            src={video.thumbnail}
                            alt={video.title}
                            fill
                            className="object-cover transition duration-200 group-hover:scale-[1.02]"
                            sizes="(max-width: 768px) 100vw, (max-width: 1440px) 40vw, 30vw"
                          />
                        </div>
                      ) : null}
                      <div className="flex flex-1 flex-col gap-2 px-4 py-4">
                        <span className="text-[16px] font-semibold text-[#0a2540]">{video.title}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            </>
          ) : null}

          {lightboxImageUrl ? (
            <div
              className="lg:col-span-12"
            >
              <div
                className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4"
                role="dialog"
                aria-modal
                onClick={() => setLightboxImageUrl(null)}
              >
                <div className="relative w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={() => setLightboxImageUrl(null)}
                    className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/70"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                  <div className="relative h-[80vh] w-full">
                    <Image src={lightboxImageUrl} alt="Screenshot" fill className="rounded-2xl object-contain" />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {featureList.length > 0 ? (
            <>
              <div className="lg:col-span-12">
                <Divider />
              </div>
              <aside className="lg:col-span-4">
                <span className={SECTION_LABEL_CLASS}>Features</span>
              </aside>
              <section className="lg:col-span-8">
                <div className="grid gap-4 md:grid-cols-2">
                  {featureList.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 text-[16px] leading-[1.6] text-[#334155]">
                      <span className="mt-2 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#0a2540]" aria-hidden="true" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
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

          {permissions.length > 0 ? (
            <>
              <div className="lg:col-span-12">
                <Divider />
              </div>
              <aside className="lg:col-span-4">
                <span className={SECTION_LABEL_CLASS}>Permissions</span>
              </aside>
              <section className="lg:col-span-8 space-y-12">
                <PermissionsAccordion items={permissions} />
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

          {Array.isArray(relatedApps) && relatedApps.length > 0 ? (
            <>
              <div className="lg:col-span-12">
                <Divider />
              </div>
              <section className="lg:col-span-12">
                      <h2 className="text-[20px] font-semibold leading-tight text-[#0a2540] sm:text-[22px] pb-8">Related Apps</h2>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {relatedApps.map((app) => (
                    <a
                      key={app.slug}
                      href={`/${app.slug}`}
                      className="group flex h-full flex-col justify-between rounded-[12px] border border-[#e6e8eb] bg-white p-4 transition hover:border-[#bfd0ff] hover:shadow-md"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[15px] font-semibold text-[#0a2540] group-hover:underline">
                          {app.name}
                        </span>
                        {app.primaryCategory ? (
                          <span className="rounded-full bg-[#f6f9fc] px-3 py-1 text-[11px] font-medium text-[#425466]">
                            {app.primaryCategory}
                          </span>
                        ) : null}
                      </div>
                      <span className="mt-3 text-[13px] font-medium text-[#635bff]">View →</span>
                    </a>
                  ))}
                </div>
              </section>
            </>
          ) : null}


          {Array.isArray(relatedPosts) && relatedPosts.length > 0 ? (
            <>
              <div className="lg:col-span-12">
                <Divider />
              </div>
              <section className="lg:col-span-12 space-y-6">
                <div className="space-y-3">
                  <h2 className="text-[20px] font-semibold leading-tight text-[#0a2540] sm:text-[22px]">
                    Related Articles
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 xl:grid-cols-3">
                  {relatedPosts.slice(0, 3).map((post, index) => (
                    <a key={`${post.slug}-${index}`} href={`/blog/${post.slug}`} className="block">
                      <Card className="h-full overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg">
                        <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                          <div className="p-6 text-center">
                            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                              {/* icon placeholder for parity with other lander */}
                            </div>
                          </div>
                        </div>
                        <CardHeader>
                          {(post.tags ?? []).length > 0 && (
                            <div className="mb-2 flex flex-wrap gap-2">
                              {(post.tags ?? []).slice(0, 3).map((tag) => (
                                <Badge key={`${post.slug}-header-${tag}`} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <CardTitle className="line-clamp-2 text-lg font-semibold">{post.title}</CardTitle>
                          <p className="line-clamp-3 text-sm text-muted-foreground">{post.description}</p>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            {post.author && <span>{post.author}</span>}
                            {post.date && <time dateTime={post.date}>{post.date.slice(0, 10)}</time>}
                          </div>
                        </CardContent>
                      </Card>
                    </a>
                  ))}
                </div>
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
  const testModeUrl = getPaymentLinkTestUrl(product);
  const pricing = buildPricingDisplay(product);

  const metadata: MetadataRow[] = [];


  if (product.categories && product.categories.length > 0) {
    const categories = product.categories.filter((category) => category.trim().length > 0);
    if (categories.length > 0) {
      metadata.push({
        label: "Categories",
        value: categories.join(", "),
      });
    }
  }

  if (pricing) {
    metadata.push({
      label: "Pricing",
      value: pricing,
    });
  }

  if (supportedLanguages.length > 0) {
    metadata.push({
      label: "Supported languages",
      value: supportedLanguages.join(", "),
    });
  }

  if (product.supported_operating_systems && product.supported_operating_systems.length > 0) {
    const systems = product.supported_operating_systems.filter((system) => system.trim().length > 0);
    if (systems.length > 0) {
      const grouped = chunkArray(systems, 2)
        .map((group) => group.join(", "))
        .join("\n");

      metadata.push({
        label: "Supported platforms",
        value: (
          <span className="whitespace-pre-line text-[16px] leading-[1.6] text-[#334155]">
            {grouped}
          </span>
        ),
      });
    }
  }

  if (product.supported_regions && product.supported_regions.length > 0) {
    const regions = product.supported_regions.filter((region) => region.trim().length > 0);
    if (regions.length > 0) {
      metadata.push({
        label: "Supported regions",
        value: regions.join(", "),
      });
    }
  }


  if (product.return_policy?.method || product.return_policy?.url) {
    const pieces = [
      product.return_policy?.method?.trim(),
      product.return_policy?.fees?.trim(),
    ].filter((value) => value && value.toLowerCase() !== "no returns accepted" && value.toLowerCase() !== "non-refundable purchase");
    if (pieces.length > 0 || product.return_policy?.url) {
      metadata.push({
        label: "Return policy",
        value: (
          <span className="flex flex-col gap-1">
            {pieces.length > 0 ? pieces.join(" — ") : null}
            {product.return_policy?.url ? <RailLink href={product.return_policy.url} label="Policy details" /> : null}
          </span>
        ),
      });
    }
  }

  const resourceLinks: Array<{ label: string; href: string }> = [];
  if (product.serp_co_product_page_url) {
    resourceLinks.push({ label: "serp.co", href: product.serp_co_product_page_url });
  }
  if (product.chrome_webstore_link) {
    resourceLinks.push({ label: "Chrome Store", href: product.chrome_webstore_link });
  }
  if (product.firefox_addon_store_link) {
    resourceLinks.push({ label: "Firefox Addons", href: product.firefox_addon_store_link });
  }
  if (product.edge_addons_store_link) {
    resourceLinks.push({ label: "Microsoft Addons", href: product.edge_addons_store_link });
  }
  if (product.opera_addons_store_link) {
    resourceLinks.push({ label: "Opera Addons", href: product.opera_addons_store_link });
  }

  if (resourceLinks.length > 0) {
    metadata.push({
      label: "Resources",
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

function buildPricingDisplay(product: ProductData) {
  const label = product.pricing?.label?.trim();
  const price = product.pricing?.price?.trim();

  if (label && price) {
    return `${label}`;
  }

  if (price) {
    return price;
  }

  if (label) {
    return label;
  }

  return null;
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

function buildPermissionItems(product: ProductData): PermissionAccordionItem[] {
  const items =
    product.permission_justifications
      ?.filter((entry) => entry.permission && entry.justification)
      .map((entry, index) => ({
        id: `${entry.permission}-${index}`,
        label: entry.permission,
        description: entry.justification,
        learnMoreUrl: entry.learn_more_url,
      })) ?? [];

  return items;
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

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) return [items];
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    result.push(items.slice(index, index + chunkSize));
  }
  return result;
}

function buildFallbackVideoItems(product: ProductData, fallbackThumbnail?: string): VideoCardItem[] {
  const videos: string[] = [];
  if (Array.isArray(product.product_videos)) {
    videos.push(...product.product_videos);
  }
  if (Array.isArray(product.related_videos)) {
    videos.push(...product.related_videos);
  }

  const seen = new Set<string>();
  const results: VideoCardItem[] = [];

  videos.forEach((rawUrl, index) => {
    if (typeof rawUrl !== "string") {
      return;
    }
    const url = rawUrl.trim();
    if (!url || seen.has(url)) {
      return;
    }
    seen.add(url);

    const thumbnail = deriveFallbackVideoThumbnail(url) ?? fallbackThumbnail ?? undefined;

    results.push({
      url,
      title: deriveFallbackVideoTitle(url, product.name ?? product.platform ?? "Video", index + 1),
      thumbnail,
    });
  });

  return results;
}

type RelatedArticleItem = {
  url: string;
  label: string;
};

function buildRelatedArticles(product: ProductData): RelatedArticleItem[] {
  return (
    product.related_posts ?? []
  )
    .map((value, index) => {
      const url = typeof value === "string" ? value.trim() : "";
      if (!url) return null;
      return {
        url,
        label: deriveArticleLabel(url, product.name ?? product.platform ?? "Article", index + 1),
      } satisfies RelatedArticleItem;
    })
    .filter((item): item is RelatedArticleItem => Boolean(item));
}

function deriveArticleLabel(url: string, fallbackBase: string, ordinal: number): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    if (pathSegments.length > 0) {
      const lastSegment = decodeURIComponent(pathSegments[pathSegments.length - 1]);
      const cleaned = lastSegment.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
      if (cleaned.length > 0) {
        return `${host} • ${capitalize(cleaned)}`;
      }
    }
    return host || fallbackBase;
  } catch {
    return `${fallbackBase} resource ${ordinal}`;
  }
}

function capitalize(value: string): string {
  if (!value) return value;
  return value
    .split(" ")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function deriveFallbackVideoTitle(url: string, fallbackBase: string, ordinal: number): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host.includes("youtube")) {
      return `YouTube • ${fallbackBase}`;
    }
    if (host.includes("vimeo")) {
      return `Vimeo • ${fallbackBase}`;
    }
    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    if (pathSegments.length > 0) {
      const lastSegment = decodeURIComponent(pathSegments[pathSegments.length - 1]);
      const cleaned = lastSegment.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
      if (cleaned.length > 0) {
        return `${host} • ${capitalize(cleaned)}`;
      }
    }
    return host || `${fallbackBase} video ${ordinal}`;
  } catch {
    return `${fallbackBase} video ${ordinal}`;
  }
}

function deriveFallbackVideoThumbnail(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      if (id) {
        return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
      }
    }
    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.replace("/", "");
      if (id) {
        return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
      }
    }
  } catch {
    return null;
  }
  return null;
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
              <dd className="text-[16px] leading-[1.6] text-[#334155]">{item.value}</dd>
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

function getPaymentLinkTestUrl(product: ProductData): string | null {
  const link = product.payment_link;
  if (!link) return null;
  if ("test_url" in link) {
    const value = link.test_url;
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return null;
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
  return <div className="border-b border-[#e6e8eb]" />;
}
