import type { ReactNode } from "react";
import type { HeroLink } from "@repo/ui/components/hero";
import type { HeroMediaProps } from "@repo/ui/components/hero-media";
import type { PricingCtaProps } from "@repo/ui/sections/PricingCta";
import type { PostItem } from "@repo/ui/sections/PostsSection";
import type { FaqItem } from "@/components/product/landers/marketplace/sections/FaqAccordion";
import type { ProductPermissionEntry } from "@/lib/products/view-model";
import type { PermissionDisplayItem } from "@/components/product/shared/mapPermissionItemsToFaq";
import type { FAQ, HomeTemplateProps } from "./home-template.types";
import { LEGAL_FAQ_TEMPLATE } from "@/lib/products/product-schema";

type HeroMediaItem = HeroMediaProps["items"][number];

export type HomeTemplateViewModel = {
  breadcrumbs: Array<{ label: string; href?: string }> | null;
  hero: {
    title: string;
    description: string;
    links: HeroLink[];
    media: HeroMediaItem[];
  };
  categories: string[];
  features: Array<{ title: string; description: string }>;
  faqItems: FaqItem[];
  pricing: {
    enabled: boolean;
    props: PricingCtaProps;
  };
  permissions: PermissionDisplayItem[];
  resourceLinks: Array<{ label: string; href: string }>;
  posts: {
    show: boolean;
    items: PostItem[];
    heading?: string;
  };
  aboutSection: HomeTemplateProps["about"] | null;
  videoSection: ReactNode | null;
};

type BuildHomeTemplateOptions = HomeTemplateProps & {
  heroVideoLinkIcon?: ReactNode;
};

const HERO_VIDEO_LINK_LABEL = "Watch demo";

const DEFAULT_FEATURES: Array<{ title: string; description: string }> = [
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

export function buildHomeTemplateViewModel(options: BuildHomeTemplateOptions): HomeTemplateViewModel {
  const {
    platform,
    heroVideoLinkIcon,
    videoUrl,
    exampleUrl,
    heroLightThumbnailSrc,
    heroDarkThumbnailSrc,
    heroVideoTitle,
    heroTitle = `${platform} Video Downloader`,
    heroDescription = "",
    cta,
    ctaHref,
    ctaText,
    faqs,
    screenshots,
    featureHighlights,
    posts,
    postsTitle,
    pricing,
    breadcrumbs,
    showPosts = true,
    videoSection,
    permissionItems,
    about,
    resourceLinks,
    onPrimaryCtaClick,
  } = options;

  const heroMedia = buildHeroMediaItems({
    videoUrl,
    exampleUrl,
    heroLightThumbnailSrc,
    heroDarkThumbnailSrc,
    heroVideoTitle,
    screenshots,
  });

  const normalizedFeatures = normalizeFeatures(featureHighlights) ?? DEFAULT_FEATURES;
  const faqItems = buildFaqItems(faqs, platform);

  const { primaryCtaHref, primaryCtaText } = resolvePrimaryCta({
    pricing,
    cta,
    fallbackHref: ctaHref,
    fallbackText: ctaText,
  });

  const heroLinks = buildHeroLinks({
    heroMedia,
    heroVideoLinkIcon,
    heroVideoUrl: videoUrl ?? exampleUrl ?? "#",
    primaryCtaHref,
    primaryCtaText,
    onPrimaryCtaClick,
  });

  const pricingView = buildPricingView({
    pricing,
    platform,
    primaryCtaHref,
    primaryCtaText,
    normalizedFeatures,
  });

  return {
    breadcrumbs: Array.isArray(breadcrumbs) && breadcrumbs.length > 0 ? breadcrumbs : null,
    hero: {
      title: heroTitle,
      description: heroDescription,
      links: heroLinks,
      media: heroMedia.items,
    },
    categories: normalizeCategories(options.categories),
    features: normalizedFeatures,
    faqItems,
    pricing: pricingView,
    permissions: normalizePermissionItems(permissionItems),
    resourceLinks: normalizeResourceLinks(resourceLinks),
    posts: normalizePosts({
      posts,
      postsTitle,
      showPosts,
    }),
    aboutSection: about ?? null,
    videoSection: videoSection ?? null,
  };
}

type HeroMediaInput = Pick<
  HomeTemplateProps,
  "videoUrl" | "exampleUrl" | "heroLightThumbnailSrc" | "heroDarkThumbnailSrc" | "heroVideoTitle" | "screenshots"
>;

function buildHeroMediaItems({
  videoUrl,
  exampleUrl,
  heroLightThumbnailSrc,
  heroDarkThumbnailSrc,
  heroVideoTitle,
  screenshots,
}: HeroMediaInput): { items: HeroMediaItem[]; firstVideoIndex: number } {
  const items: HeroMediaItem[] = [];

  if (typeof videoUrl === "string" && videoUrl.trim().length > 0) {
    items.push({
      type: "video",
      src: videoUrl.trim(),
      title: heroVideoTitle,
      alt: heroVideoTitle,
      thumbnail: heroLightThumbnailSrc ?? heroDarkThumbnailSrc,
    });
  }

  if ((!videoUrl || videoUrl.trim().length === 0) && typeof exampleUrl === "string" && exampleUrl.trim().length > 0) {
    items.push({
      type: "video",
      src: exampleUrl.trim(),
      title: heroVideoTitle,
      alt: heroVideoTitle,
      thumbnail: heroLightThumbnailSrc ?? heroDarkThumbnailSrc,
    });
  }

  const extraScreenshots = Array.isArray(screenshots)
    ? screenshots
        .filter((shot) => Boolean(shot?.src && shot.src.trim().length > 0))
        .slice(0, 6)
        .map((shot) => ({
          type: "image" as const,
          src: shot.src.trim(),
          alt: shot.alt,
          title: shot.alt,
        }))
    : [];

  if (extraScreenshots.length > 0) {
    items.push(...extraScreenshots);
  }

  const firstVideoIndex = items.findIndex((item) => item.type === "video");

  return { items, firstVideoIndex };
}

function normalizeFeatures(
  featureHighlights: HomeTemplateProps["featureHighlights"],
): Array<{ title: string; description: string }> | null {
  if (!Array.isArray(featureHighlights) || featureHighlights.length === 0) {
    return null;
  }

  return featureHighlights
    .map((feature) => {
      if (typeof feature === "string") {
        const trimmed = feature.trim();
        if (trimmed.length === 0) return null;
        return { title: trimmed, description: "" };
      }
      const title = feature.title?.trim();
      if (!title) return null;
      return {
        title,
        description: feature.description?.trim() ?? "",
      };
    })
    .filter((value): value is { title: string; description: string } => Boolean(value));
}

function normalizeCategories(categories?: string[]): string[] {
  if (!Array.isArray(categories) || categories.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  categories.forEach((category) => {
    if (typeof category !== "string") {
      return;
    }
    const trimmed = category.trim();
    if (!trimmed) {
      return;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    result.push(trimmed);
  });

  return result;
}

function buildDefaultFaqs(platform: string): FaqItem[] {
  const normalizedPlatform = platform.trim() || "the platform";
  return [
    {
      id: createFaqItemId(`download-any-${normalizedPlatform}`, 0),
      question: `Can I download any ${normalizedPlatform} video?`,
      answer:
        "You can download your own videos and those shared with you when you have permission. If the owner restricts downloads or the video is private, you may not be able to download it.",
    },
    {
      id: createFaqItemId(`download-option-${normalizedPlatform}`, 1),
      question: `Why don't I see a download option on ${normalizedPlatform}?`,
      answer:
        "Availability depends on the owner's settings and plan limits. Owners can disable downloads, and some free-plan limitations may apply.",
    },
    {
      id: createFaqItemId("is-this-legal", 2),
      question: LEGAL_FAQ_TEMPLATE.question,
      answer: LEGAL_FAQ_TEMPLATE.answer,
    },
  ];
}

function buildFaqItems(faqs: FAQ[] | undefined, platform: string): FaqItem[] {
  const legalQuestion = LEGAL_FAQ_TEMPLATE.question.trim().toLowerCase();
  const normalizedFaqs =
    faqs
      ?.map((faq, index) => {
        const question = faq.question?.trim();
        const answer = faq.answer?.trim();
        if (!question || !answer) {
          return null;
        }
        const normalizedQuestion = question.toLowerCase();
        return {
          id: createFaqItemId(question, index),
          question,
          answer: normalizedQuestion === legalQuestion ? LEGAL_FAQ_TEMPLATE.answer : answer,
        };
      })
      .filter((value): value is FaqItem => Boolean(value)) ?? [];

  if (normalizedFaqs.length > 0) {
    return normalizedFaqs;
  }

  return buildDefaultFaqs(platform);
}

function createFaqItemId(question: string, index: number): string {
  const normalized = question
    .normalize("NFKD")
    .replace(/[\u0300-\u036F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const fallback = normalized.length > 0 ? normalized : `faq-${index}`;
  return `faq-${fallback}-${index}`;
}

type ResolvePrimaryCtaInput = {
  pricing: HomeTemplateProps["pricing"];
  cta: HomeTemplateProps["cta"];
  fallbackHref?: string;
  fallbackText?: string;
};

function resolvePrimaryCta({
  pricing,
  cta,
  fallbackHref,
  fallbackText,
}: ResolvePrimaryCtaInput): { primaryCtaHref: string; primaryCtaText: string } {
  const pricingSectionId = (pricing?.id ?? "pricing").replace(/^#/, "");
  const pricingSectionEnabled = pricing?.enabled ?? true;

  const primaryCtaHref =
    cta?.href ??
    fallbackHref ??
    (pricingSectionEnabled ? `#${pricingSectionId}` : undefined) ??
    "#pricing";

  const rawText = cta?.text ?? fallbackText ?? "Get It Now";
  const primaryCtaText = rawText.trim().length > 0 ? rawText : "Get It Now";

  return {
    primaryCtaHref,
    primaryCtaText,
  };
}

type BuildHeroLinksInput = {
  heroMedia: { items: HeroMediaItem[]; firstVideoIndex: number };
  heroVideoLinkIcon?: ReactNode;
  heroVideoUrl: string;
  primaryCtaHref: string;
  primaryCtaText: string;
  onPrimaryCtaClick?: () => void;
};

function buildHeroLinks({
  heroMedia,
  heroVideoLinkIcon,
  heroVideoUrl,
  primaryCtaHref,
  primaryCtaText,
  onPrimaryCtaClick,
}: BuildHeroLinksInput): HeroLink[] {
  const links: HeroLink[] = [];

  if (heroMedia.firstVideoIndex !== -1) {
    links.push({
      label: HERO_VIDEO_LINK_LABEL,
      icon: heroVideoLinkIcon,
      variant: "outline",
      openMediaIndex: heroMedia.firstVideoIndex,
    });
  } else if (heroVideoUrl && heroVideoUrl !== "#") {
    links.push({
      label: HERO_VIDEO_LINK_LABEL,
      icon: heroVideoLinkIcon,
      variant: "outline",
      url: heroVideoUrl,
    });
  }

  const heroCtaLabel = primaryCtaText.toUpperCase();

  // Always include the URL, and optionally add onClick for programmatic checkout
  links.push({
    label: heroCtaLabel,
    url: primaryCtaHref,
    onClick: onPrimaryCtaClick,
    "data-testid": "product-primary-cta",
  });

  return links;
}

type BuildPricingViewInput = {
  pricing: HomeTemplateProps["pricing"];
  platform: string;
  primaryCtaHref: string;
  primaryCtaText: string;
  normalizedFeatures: Array<{ title: string; description: string }>;
};

function buildPricingView({
  pricing,
  platform,
  primaryCtaHref,
  primaryCtaText,
  normalizedFeatures,
}: BuildPricingViewInput): HomeTemplateViewModel["pricing"] {
  const defaultBenefitList = normalizedFeatures.slice(0, 5).map((feature) => feature.title);
  const benefits = pricing?.benefits ?? pricing?.features ?? defaultBenefitList;
  const showPriceDetails = pricing?.showPriceDetails !== false;

  const pricingProps: PricingCtaProps = {
    heading: pricing?.heading ?? `Get ${platform} Downloader Today`,
    productName: pricing?.productName ?? platform,
    priceLabel: showPriceDetails ? pricing?.priceLabel ?? "One-time purchase" : undefined,
    price: showPriceDetails ? pricing?.price ?? "$47" : undefined,
    originalPrice: showPriceDetails ? pricing?.originalPrice : undefined,
    benefits,
    ctaText: pricing?.ctaText ?? primaryCtaText,
    ctaHref: pricing?.ctaHref ?? primaryCtaHref,
    onCtaClick: pricing?.onCtaClick,
    ctaLoading: pricing?.ctaLoading,
    ctaDisabled: pricing?.ctaDisabled,
    ctaExtra: pricing?.ctaExtra,
    terms: pricing?.terms,
    id: pricing?.id ?? "pricing",
  };

  return {
    enabled: pricing?.enabled ?? true,
    props: pricingProps,
  };
}

function normalizePermissionItems(permissionItems: ProductPermissionEntry[] | undefined): PermissionDisplayItem[] {
  if (!Array.isArray(permissionItems) || permissionItems.length === 0) {
    return [];
  }

  const normalized: PermissionDisplayItem[] = [];

  permissionItems.forEach((entry) => {
    const question = entry.question?.trim();
    const answer = entry.answer?.trim();
    if (!question || !answer) {
      return;
    }

    const identifier = typeof entry.id === "string" && entry.id.trim().length > 0 ? entry.id : question;

    normalized.push({
      id: identifier,
      title: question,
      description: answer,
      learnMoreUrl: entry.learnMoreUrl,
    });
  });

  return normalized;
}

function normalizeResourceLinks(
  resourceLinks: HomeTemplateProps["resourceLinks"],
): HomeTemplateViewModel["resourceLinks"] {
  if (!Array.isArray(resourceLinks) || resourceLinks.length === 0) {
    return [];
  }

  return resourceLinks
    .map((link) => {
      const label = link.label?.trim();
      const href = link.href?.trim();
      if (!label || !href) {
        return null;
      }
      return { label, href };
    })
    .filter((value): value is { label: string; href: string } => Boolean(value));
}

type NormalizePostsInput = {
  posts: HomeTemplateProps["posts"];
  postsTitle: HomeTemplateProps["postsTitle"];
  showPosts: HomeTemplateProps["showPosts"];
};

function normalizePosts({ posts, postsTitle, showPosts }: NormalizePostsInput): HomeTemplateViewModel["posts"] {
  const validPosts = Array.isArray(posts) ? posts.filter(Boolean) : [];
  return {
    show: Boolean(showPosts) && validPosts.length > 0,
    items: validPosts,
    heading: postsTitle,
  };
}
