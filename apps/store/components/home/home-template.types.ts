import type { ComponentType, ReactNode } from "react";
import type { Screenshot } from "@repo/ui/sections/ScreenshotsCarousel";
import type { FAQ } from "@repo/ui/sections/FaqSection";
import type { PostItem } from "@repo/ui/sections/PostsSection";
import type { PricingCtaProps } from "@repo/ui/sections/PricingCta";
import type { HeroMediaItem } from "@repo/ui/sections/Hero";

type GenericComponent = ComponentType<Record<string, unknown>>;

export type PermissionJustificationItem = {
  permission: string;
  justification: string;
  learn_more_url?: string;
};

export type HomeTemplateUi = {
  Navbar: GenericComponent;
  Footer: GenericComponent;
  Button: GenericComponent;
  Card: GenericComponent;
  CardHeader: GenericComponent;
  CardTitle: GenericComponent;
  CardContent: GenericComponent;
  CardDescription?: GenericComponent;
  Badge: GenericComponent;
  Input: GenericComponent; // kept for compatibility though not used in the hero anymore
};

export type HomeTemplateProps = {
  ui: HomeTemplateUi;
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
  testimonials?: Array<Record<string, unknown>>;
  testimonialsHeading?: string;
  posts?: PostItem[];
  postsTitle?: string;
  pricing?: Omit<
    PricingCtaProps,
    | "ctaHref"
    | "ctaText"
    | "onCtaClick"
    | "ctaLoading"
    | "ctaDisabled"
    | "terms"
  > & {
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
  videoSection?: ReactNode;
  permissionJustifications?: PermissionJustificationItem[];
  about?: {
    title: string;
    paragraphs: string[];
  };
};
