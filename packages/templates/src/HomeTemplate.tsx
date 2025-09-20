"use client";

import type { ComponentType } from "react";
import type { Screenshot } from "@repo/ui/sections/ScreenshotsCarousel";
import { Hero, type HeroMediaItem } from "./sections/Hero";
import { PricingCta, type PricingCtaProps } from "./sections/PricingCta";
import { FeaturesSection } from "./sections/FeaturesSection";
import { TestimonialsSection } from "./sections/TestimonialsSection";
import { PostsSection } from "./sections/PostsSection";
import { FaqSection, type FAQ } from "./sections/FaqSection";

type UI = {
  Navbar: ComponentType<any>;
  Footer: ComponentType<any>;
  Button: ComponentType<any>;
  Card: ComponentType<any>;
  CardHeader: ComponentType<any>;
  CardTitle: ComponentType<any>;
  CardContent: ComponentType<any>;
  CardDescription?: ComponentType<any>;
  Badge: ComponentType<any>;
  Input: ComponentType<any>; // kept for compatibility though not used in the hero anymore
};


export type HomeTemplateProps = {
  ui: UI;
  platform: string; // e.g., "Vimeo", "Loom"
  videoUrl?: string; // preferred prop name
  exampleUrl?: string; // deprecated: kept for backward compatibility
  heroLightThumbnailSrc?: string;
  heroDarkThumbnailSrc?: string;
  heroVideoTitle?: string;
  badgeText?: string;
  heroTitle?: string;
  heroDescription?: string;
  ctaTitle?: string;
  ctaDescription?: string;
  ctaHref?: string;
  ctaText?: string; // Used in hero as the main CTA label
  faqs?: FAQ[];
  screenshots?: Screenshot[];
  featureHighlights?: Array<{ title: string; description?: string } | string>;
  testimonials?: any[];
  testimonialsHeading?: string;
  posts?: import("./sections/PostsSection").PostItem[];
  postsTitle?: string;
  pricing?: Omit<PricingCtaProps, "ctaHref" | "ctaText" | "onCtaClick" | "ctaLoading" | "ctaDisabled" | "terms"> & {
    ctaHref?: string;
    ctaText?: string;
    enabled?: boolean;
    onCtaClick?: PricingCtaProps["onCtaClick"];
    ctaLoading?: PricingCtaProps["ctaLoading"];
    ctaDisabled?: PricingCtaProps["ctaDisabled"];
    terms?: PricingCtaProps["terms"];
  };
  breadcrumbs?: Array<{ label: string; href?: string }>;
  showPosts?: boolean;
};

export function HomeTemplate({
  ui,
  platform,
  videoUrl,
  exampleUrl,
  heroLightThumbnailSrc,
  heroDarkThumbnailSrc,
  heroVideoTitle,
  badgeText = ``,
  heroTitle = `${platform} Video Downloader`,
  heroDescription = `Download ${platform} videos, audio, and transcripts instantly. `,
  ctaTitle = `Start Downloading ${platform} Videos Now`,
  ctaDescription = `Join users who trust our ${platform} downloader`,
  ctaHref = "#download",
  ctaText = "Get It Now",
  faqs,
  screenshots,
  featureHighlights,
  testimonials,
  testimonialsHeading,
  posts,
  postsTitle,
  pricing,
  breadcrumbs,
  showPosts = true,
}: HomeTemplateProps) {
  const { Navbar, Footer, Button, Badge, Input, Card, CardHeader, CardTitle, CardContent, CardDescription } = ui as any;

  const heroMediaItems: HeroMediaItem[] = [];
  if (videoUrl) {
    heroMediaItems.push({
      type: "video",
      src: videoUrl,
      lightThumbnailSrc: heroLightThumbnailSrc,
      darkThumbnailSrc: heroDarkThumbnailSrc,
      alt: heroVideoTitle,
      title: heroVideoTitle,
    });
  }

  if (Array.isArray(screenshots) && screenshots.length > 0) {
    heroMediaItems.push(
      ...screenshots.slice(0, 6).map((shot) => ({
        type: "image" as const,
        src: shot.src,
        alt: shot.alt,
        title: shot.alt,
      }))
    );
  }

  const defaultFeatures = [
    { title: "One-click download from any video page", description: "" },
    { title: "100% privacy-friendly – no tracking or data collection", description: "" },
    { title: "Auto-detect videos on the page", description: "" },
    { title: "Smart Page Scan", description: "" },
    { title: "Embedded Video Support", description: "" },
    { title: "Full HD Downloads", description: "" },
    { title: "Lightning fast downloads (no re-encoding)", description: "" },
    { title: "Original quality preserved (up to 4K)", description: "" },
    { title: "No registration or personal data required", description: "" },
    { title: "No watermarks or branding added", description: "" },
    { title: "Zero Ads", description: "" },
    { title: "Regular Updates", description: "" },
    { title: "Thumbnail Preview", description: "" },
    { title: "Minimal Permissions", description: "" },
    { title: "Download Progress Bar", description: "" },
  ];

  const normalizedFeatures =
    featureHighlights?.map((feature) => {
      if (typeof feature === "string") {
        return { title: feature, description: "" };
      }
      return {
        title: feature.title,
        description: feature.description ?? "",
      };
    }) ?? defaultFeatures;

  const defaultFaqs: FAQ[] = [
    { question: `Can I download any ${platform} video?`, answer: `You can download your own videos and those shared with you when you have permission. If the owner restricts downloads or the video is private, you may not be able to download it.` },
    { question: `Why dont I see a download option on ${platform}?`, answer: `Availability depends on the owners settings and plan limits. Owners can disable downloads, and some free-plan limitations may apply.` },
    { question: `Is it legal to download ${platform} videos?`, answer: `Only download videos when you have rights or explicit permission from the owner. Downloading protected content without consent can violate copyright and terms.` },
    { question: `Is it legal to download ${platform} videos?`, answer: `Only download videos when you have rights or explicit permission from the owner. Downloading protected content without consent can violate copyright and terms.` },
    { question: `Is it legal to download ${platform} videos?`, answer: `Only download videos when you have rights or explicit permission from the owner. Downloading protected content without consent can violate copyright and terms.` },
  ];

  const faqList = faqs ?? defaultFaqs;
  const defaultBenefitList = normalizedFeatures.slice(0, 5).map((feature) => feature.title);
  const pricingBenefitList = pricing?.benefits ?? pricing?.features ?? defaultBenefitList;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        {Array.isArray(breadcrumbs) && breadcrumbs.length > 0 && (
          <nav className="container pt-8 text-sm text-muted-foreground" aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2">
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <li key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                    {crumb.href && !isLast ? (
                      <a
                        href={crumb.href}
                        className="transition-colors hover:text-primary"
                      >
                        {crumb.label}
                      </a>
                    ) : (
                      <span className={isLast ? "text-foreground" : undefined}>{crumb.label}</span>
                    )}
                    {!isLast && <span className="text-muted-foreground">/</span>}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
        {/* Hero (input removed, CTA changed) */}
        <Hero
          badgeText={badgeText}
          heroTitle={heroTitle}
          heroDescription={heroDescription}
          ctaHref={ctaHref}
          ctaText={ctaText}
          mediaItems={heroMediaItems}
          videoSrc={videoUrl ?? exampleUrl}
          videoTitle={heroVideoTitle}
          lightThumbnailSrc={heroLightThumbnailSrc}
          darkThumbnailSrc={heroDarkThumbnailSrc}
          ui={{ Badge, Button }}
        />

        {/* Features */}
        <FeaturesSection features={normalizedFeatures} />

        {/* Testimonials */}
        <TestimonialsSection testimonials={testimonials as any} heading={testimonialsHeading ?? "Reviews"} />

        {/* FAQ */}
        <FaqSection faqs={faqList} />

        {/* Pricing CTA (configurable per site) */}
        {(pricing?.enabled ?? true) && (
          <PricingCta
            heading={pricing?.heading ?? `Get ${platform} Downloader Today`}
            subheading={pricing?.subheading ?? heroDescription}
            priceLabel={pricing?.priceLabel ?? "One-time purchase"}
            price={pricing?.price ?? "$47"}
            originalPrice={pricing?.originalPrice}
            priceNote={pricing?.priceNote ?? "Lifetime access • Free updates"}
            benefits={pricingBenefitList}
            ctaText={pricing?.ctaText ?? ctaText}
            ctaHref={pricing?.ctaHref ?? ctaHref}
            onCtaClick={pricing?.onCtaClick}
            ctaLoading={pricing?.ctaLoading}
            ctaDisabled={pricing?.ctaDisabled}
            terms={pricing?.terms}
            id={pricing?.id ?? "pricing"}
          />
        )}

        {showPosts && Array.isArray(posts) && posts.length > 0 && (
          <PostsSection
            posts={posts}
            heading={postsTitle ?? "Posts"}
            Badge={Badge}
            Card={Card}
            CardHeader={CardHeader}
            CardTitle={CardTitle}
            CardContent={CardContent}
            CardDescription={CardDescription}
          />
        )}

        <Footer />
      </main>
    </>
  );
}

export default HomeTemplate;
