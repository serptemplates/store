import type { ComponentType, ReactNode } from "react";
import type { Screenshot } from "@repo/ui/sections/ScreenshotsCarousel";
import type { PostItem } from "@repo/ui/sections/PostsSection";
import type { PricingCtaProps } from "@repo/ui/sections/PricingCta";
import type { ProductPermissionEntry } from "@/lib/products/view-model";

type GenericComponent = ComponentType<Record<string, unknown>>;

export type FAQ = { question: string; answer: string };

export type Testimonial = {
  id: string | number;
  name: string;
  designation?: string;
  company?: string;
  testimonial: string;
  avatar?: string;
  url?: string;
};

export type HomeCtaMode = "checkout" | "external" | "pre_release";

export type CtaAnalyticsContext = {
  destination: "checkout" | "external" | "waitlist";
};

export type ResolvedHomeCta = {
  mode: HomeCtaMode;
  href: string;
  text: string;
  target: "_self" | "_blank";
  rel?: string;
  opensInNewTab: boolean;
  analytics?: CtaAnalyticsContext;
};

export type HomeTemplateUi = {
  Navbar: GenericComponent;
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
  ctaMode?: HomeCtaMode;
  ctaTarget?: "_self" | "_blank";
  ctaRel?: string;
  ctaOpensInNewTab?: boolean;
  cta?: ResolvedHomeCta;
  onPrimaryCtaClick?: () => void;
  faqs?: FAQ[];
  screenshots?: Screenshot[];
  featureHighlights?: Array<{ title: string; description?: string } | string>;
  testimonials?: Testimonial[];
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
    showPriceDetails?: boolean;
  };
  breadcrumbs?: Array<{ label: string; href?: string }>;
  showPosts?: boolean;
  videoSection?: ReactNode;
  permissionItems?: ProductPermissionEntry[];
  about?: {
    title: string;
    paragraphs: string[];
  };
  resourceLinks?: Array<{
    label: string;
    href: string;
  }>;
  categories?: string[];
  trademarkNotice?: string | null;
};
