"use client";

import { FaYoutube } from "react-icons/fa6";
import Hero from "@repo/ui/components/hero";
import { PricingCta } from "@repo/ui/sections/PricingCta";
import { FeaturesSection } from "@repo/ui/sections/FeaturesSection";
import { SocialProofScreenshots } from "@repo/ui/sections/SocialProofScreenshots";
import { PostsSection } from "@repo/ui/sections/PostsSection";
import { FaqSection } from "@repo/ui/sections/FaqSection";
import type { FAQ } from "@repo/ui/sections/FaqSection";
import { AboutSection } from "@repo/ui/sections/AboutSection";
import type { HeroMediaItem } from "@repo/ui/sections/Hero";
import { PermissionsJustificationAccordion } from "@/components/product/PermissionsJustificationAccordion";
import type { HomeTemplateProps } from "./home-template.types";
import { teamMembers } from "@/data/team";
import { ProductAboutSection } from "@/components/product/ProductAboutSection";

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
  heroDescription = "",
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
  videoSection,
  permissionJustifications,
  about,
}: HomeTemplateProps) {
  const {
    Navbar,
    Footer,
    Button,
    Badge,
    Input,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
  } = ui;

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
    const validScreenshots = screenshots
      .filter((shot) => shot.src && shot.src.trim() !== "")
      .slice(0, 6)
      .map((shot) => ({
        type: "image" as const,
        src: shot.src,
        alt: shot.alt,
        title: shot.alt,
      }));

    if (validScreenshots.length > 0) {
      heroMediaItems.push(...validScreenshots);
    }
  }

  const defaultFeatures = [
    { title: "One-click download from any video page", description: "" },
    {
      title: "100% privacy-friendly – no tracking or data collection",
      description: "",
    },
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
    {
      question: `Can I download any ${platform} video?`,
      answer: `You can download your own videos and those shared with you when you have permission. If the owner restricts downloads or the video is private, you may not be able to download it.`,
    },
    {
      question: `Why dont I see a download option on ${platform}?`,
      answer: `Availability depends on the owners settings and plan limits. Owners can disable downloads, and some free-plan limitations may apply.`,
    },
    {
      question: `Is it legal to download ${platform} videos?`,
      answer: `Only download videos when you have rights or explicit permission from the owner. Downloading protected content without consent can violate copyright and terms.`,
    },
    {
      question: `Is it legal to download ${platform} videos?`,
      answer: `Only download videos when you have rights or explicit permission from the owner. Downloading protected content without consent can violate copyright and terms.`,
    },
    {
      question: `Is it legal to download ${platform} videos?`,
      answer: `Only download videos when you have rights or explicit permission from the owner. Downloading protected content without consent can violate copyright and terms.`,
    },
  ];

  const faqList = faqs ?? defaultFaqs;
  const defaultBenefitList = normalizedFeatures
    .slice(0, 5)
    .map((feature) => feature.title);
  const pricingBenefitList =
    pricing?.benefits ?? pricing?.features ?? defaultBenefitList;
  const pricingSectionId = (pricing?.id ?? "pricing").replace(/^#/, "");
  const pricingSectionEnabled = pricing?.enabled ?? true;
  const heroCtaHref =
    ctaHref ??
    (pricingSectionEnabled ? `#${pricingSectionId}` : undefined) ??
    "#pricing";
  const heroCtaLabel = (ctaText ?? "Get It Now").toUpperCase();
  const heroVideoLinkLabel = "Watch demo";
  const heroVideoHref = videoUrl
    ? videoUrl
    : exampleUrl
    ? exampleUrl
    : "#";
  const firstVideoIndex = heroMediaItems.findIndex((item) => item.type === "video");

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        {Array.isArray(breadcrumbs) && breadcrumbs.length > 0 && (
          <div className="border-b bg-gray-50">
            <nav
              className="mx-auto max-w-6xl px-4 py-4 text-sm text-muted-foreground"
              aria-label="Breadcrumb"
            >
              <ol className="flex flex-wrap items-center gap-2">
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  return (
                    <li
                      key={`${crumb.label}-${index}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      {crumb.href && !isLast ? (
                        <a
                          href={crumb.href}
                          className="transition-colors hover:text-primary"
                        >
                          {crumb.label}
                        </a>
                      ) : (
                        <span
                          className={isLast ? "text-foreground" : undefined}
                        >
                          {crumb.label}
                        </span>
                      )}
                      {!isLast && (
                        <span className="text-muted-foreground">/</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>
        )}
        <Hero
          title={heroTitle}
          description={heroDescription}
          links={[
            ...(firstVideoIndex !== -1
              ? [
                  {
                    label: heroVideoLinkLabel,
                    url: undefined,
                    variant: "outline" as const,
                    icon: <FaYoutube className="text-red-500" />,
                    openMediaIndex: firstVideoIndex,
                  },
                ]
              : videoUrl
              ? [
                  {
                    label: heroVideoLinkLabel,
                    url: heroVideoHref,
                    variant: "outline" as const,
                    icon: <FaYoutube className="text-red-500" />,
                  },
                ]
              : []),
            {
              label: heroCtaLabel,
              url: heroCtaHref,
            },
          ]}
          media={heroMediaItems.map((item) => ({
            src: item.src,
            type: item.type,
            title: item.title,
            alt: item.alt,
            thumbnail:
              item.type === "video" ? item.lightThumbnailSrc : undefined,
          }))}
        />
        {/* Hero (input removed, CTA changed) */}
        {/* <Hero
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
        /> */}

        {about ? (
          <ProductAboutSection title={about.title} paragraphs={about.paragraphs} />
        ) : null}

        {/* Features */}
        <FeaturesSection features={normalizedFeatures} />

        {/* Videos */}
        {videoSection}

        {/* Social Proof Screenshots */}
        <SocialProofScreenshots />

        {/* FAQ */}
        <FaqSection faqs={faqList} />

        {/* Pricing CTA (configurable per site) */}
        {(pricing?.enabled ?? true) && (
          <PricingCta
            heading={pricing?.heading ?? `Get ${platform} Downloader Today`}
            priceLabel={pricing?.priceLabel ?? "One-time purchase"}
            price={pricing?.price}
            originalPrice={pricing?.originalPrice}
            priceNote={pricing?.priceNote ?? ""}
            benefits={pricingBenefitList}
            ctaText={pricing?.ctaText ?? ctaText}
            ctaHref={pricing?.ctaHref ?? ctaHref}
            onCtaClick={pricing?.onCtaClick}
            ctaLoading={pricing?.ctaLoading}
            ctaDisabled={pricing?.ctaDisabled}
            ctaExtra={pricing?.ctaExtra}
            terms={pricing?.terms}
            id={pricing?.id ?? "pricing"}
          />
        )}


        {/* Team Section */}
        <AboutSection team={teamMembers} />

        {/* Permissions */}
        <PermissionsJustificationAccordion items={permissionJustifications} />

        {/* Posts */}
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

export type { HomeTemplateProps } from "./home-template.types";
