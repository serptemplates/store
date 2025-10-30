import type { FAQ } from "@repo/ui/sections/FaqSection";
import type { PostItem } from "@repo/ui/sections/PostsSection";
import type { Screenshot } from "@repo/ui/sections/ScreenshotsCarousel";
import type { Testimonial } from "@repo/ui/sections/TestimonialMarquee";
import type { HomeTemplateProps, ResolvedHomeCta } from "@/components/product/landers/default/home-template.types";
import { titleCase } from "@/lib/string-utils";
import type { BlogPostMeta } from "@/lib/blog";
import { findPriceEntry, formatAmountFromCents } from "@/lib/pricing/price-manifest";
import { resolveProductPaymentLink } from "@/lib/products/payment-link";
import type { ProductData } from "./product-schema";
import { getReleaseBadgeText } from "./release-status";
import { normalizeProductAssetPath } from "./asset-paths";

const defaultPricingBenefits = [
  "Instant access after checkout",
  "Lifetime license and updates",
  "Supports private videos",
  "Unlimited downloads included",
  "Works on macOS, Windows, and Linux"
];

const WAITLIST_EMBED_URL = "https://ghl.serp.co/widget/form/p0UQfTbXR69iXnRlE953";
const WAITLIST_LABEL = "Get Notified";
const DEFAULT_CTA_LABEL = "Get It Now";
const DEFAULT_CTA_LABEL_LOWER = DEFAULT_CTA_LABEL.toLowerCase();

const CTA_ALLOWED_PREFIXES = [
  "https://apps.serp.co/",
  "https://store.serp.co/",
  "https://ghl.serp.co/",
  "https://serp.ly/",
  "https://serp.co/",
  "https://buy.stripe.com/",
] as const;

function derivePlatform(product: ProductData): string {
  if (product.platform) {
    return product.platform;
  }

  const byName = product.name.replace(/(video downloader|downloader)$/i, "").trim();
  if (byName) return byName;

  const [first] = product.slug.split("-");
  return titleCase(first ?? "Product");
}

function toScreenshots(screenshots: ProductData["screenshots"], product: ProductData): Screenshot[] | undefined {
  if (screenshots?.length) {
    const normalized: Screenshot[] = [];

    screenshots.forEach((shot) => {
      if (!shot) {
        return;
      }

      if (typeof shot === "string") {
        const src = normalizeProductAssetPath(shot);
        if (src) {
          normalized.push({ src, alt: `${product.name} screenshot` });
        }
        return;
      }

      const src = normalizeProductAssetPath(shot.url as string | undefined);
      if (!src) {
        return;
      }

      normalized.push({
        src,
        alt: shot.alt ?? `${product.name} screenshot`,
      });
    });

    return normalized.length > 0 ? normalized : undefined;
  }

  const fallbackImages: Screenshot[] = [];
  const featured = normalizeProductAssetPath(product.featured_image);
  if (featured) {
    fallbackImages.push({
      src: featured,
      alt: `${product.name} screenshot`,
    });
  }
  const featuredGif = normalizeProductAssetPath(product.featured_image_gif);
  if (featuredGif && featuredGif !== featured) {
    fallbackImages.push({
      src: featuredGif,
      alt: `${product.name} animation`,
    });
  }

  return fallbackImages.length > 0 ? fallbackImages : undefined;
}

function toTestimonials(reviews: ProductData["reviews"]): Testimonial[] | undefined {
  if (!reviews?.length) return undefined;
  return reviews.map((review, index) => ({
    id: index,
    name: review.name,
    testimonial: review.review,
  }));
}

function toFaqs(faqs: ProductData["faqs"]): FAQ[] | undefined {
  if (!faqs?.length) return undefined;
  return faqs;
}

function parsePriceToNumber(value?: string | null): number | null {
  if (!value) return null;
  const numeric = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function formatPrice(value: number): string {
  return `$${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2)}`;
}

type ResolvedProductCta = ResolvedHomeCta;

function selectExternalDestination(product: ProductData): string {
  const candidateLinks = [
    product.buy_button_destination,
    product.pricing?.cta_href,
    product.apps_serp_co_product_page_url,
    product.store_serp_co_product_page_url,
    product.serp_co_product_page_url,
    product.serply_link,
  ];

  const resolved = candidateLinks.find(
    (link): link is string =>
      typeof link === "string"
      && link.trim().length > 0
      && (
        link.startsWith("/")
        || CTA_ALLOWED_PREFIXES.some((prefix) => link.startsWith(prefix))
      ),
  );

  return resolved ?? `https://apps.serp.co/${product.slug}`;
}

function resolveProductCta(product: ProductData): ResolvedProductCta {
  const paymentLink = resolveProductPaymentLink(product);
  const paymentLinkHref = paymentLink?.url;

  const trimmedCtaText =
    typeof product.pricing?.cta_text === "string" ? product.pricing.cta_text.trim() : "";
  const normalizedCtaText = trimmedCtaText.length > 0 ? trimmedCtaText : undefined;

  if (paymentLinkHref && product.status !== "pre_release") {
    const opensInNewTab = true;
    return {
      mode: "external",
      href: paymentLinkHref,
      text: normalizedCtaText ?? DEFAULT_CTA_LABEL,
      opensInNewTab,
      target: "_blank",
      rel: "noopener noreferrer",
      analytics: {
        destination: "payment_link",
        paymentLink: paymentLink
          ? {
              provider: paymentLink.provider,
              variant: paymentLink.variant,
              linkId: paymentLink.linkId,
              url: paymentLink.url,
            }
          : undefined,
      },
    };
  }

  const isPreRelease = product.status === "pre_release";

  if (isPreRelease) {
    const defaultWaitlistHref = "#waitlist";
    const waitlistDestination =
      typeof product.waitlist_url === "string" && product.waitlist_url.trim().length > 0
        ? product.waitlist_url.trim()
        : defaultWaitlistHref;
    return {
      mode: "pre_release",
      href: waitlistDestination,
      text: normalizedCtaText && normalizedCtaText.toLowerCase() !== DEFAULT_CTA_LABEL_LOWER
        ? normalizedCtaText
        : WAITLIST_LABEL,
      opensInNewTab: false,
      target: "_self",
      analytics: {
        destination: "waitlist",
      },
    };
  }

  const externalHref = selectExternalDestination(product);
  const opensInNewTab = !externalHref.startsWith("/") && !externalHref.startsWith("#");

  return {
    mode: "external",
    href: externalHref,
    text: normalizedCtaText ?? DEFAULT_CTA_LABEL,
    opensInNewTab,
    target: opensInNewTab ? "_blank" : "_self",
    rel: opensInNewTab ? "noopener noreferrer" : undefined,
    analytics: {
      destination: "external",
    },
  };
}

function resolvePosts(product: ProductData, posts: BlogPostMeta[]): BlogPostMeta[] {
  const desiredOrder = product.related_posts ?? [];
  if (!desiredOrder.length) {
    return posts;
  }

  const orderIndex = new Map(desiredOrder.map((slug, index) => [slug, index]));

  return posts
    .filter((post) => orderIndex.has(post.slug))
    .sort((a, b) => (orderIndex.get(a.slug)! - orderIndex.get(b.slug)!));
}

export function productToHomeTemplate(
  product: ProductData,
  posts: BlogPostMeta[] = []
): Omit<HomeTemplateProps, "ui"> {
  const platform = derivePlatform(product);
  const badgeText = getReleaseBadgeText(product);
  const heroTitle = product.name || product.seo_title || `${platform} Downloader`;
  const heroDescription = "";
  const resolvedCta = resolveProductCta(product);
  const productIsPreRelease = product.status === "pre_release";
  const rawVideoUrl = product.product_videos?.[0];
  const videoUrl = productIsPreRelease ? undefined : rawVideoUrl;
  const normalizedFeaturedImage = normalizeProductAssetPath(product.featured_image);
  const normalizedFeaturedImageGif = normalizeProductAssetPath(product.featured_image_gif);
  const screenshots = productIsPreRelease ? undefined : toScreenshots(product.screenshots, product);
  const testimonials = toTestimonials(product.reviews);
  const faqs = toFaqs(product.faqs);
  const priceManifestEntry = findPriceEntry(product.stripe?.price_id, product.stripe?.test_price_id);
  const currentPriceValue = priceManifestEntry
    ? priceManifestEntry.unitAmount / 100
    : parsePriceToNumber(product.pricing?.price);
  const formattedPrice = priceManifestEntry
    ? formatAmountFromCents(priceManifestEntry.unitAmount, priceManifestEntry.currency)
    : product.pricing?.price ?? (currentPriceValue != null ? formatPrice(currentPriceValue) : undefined);
  let derivedOriginalPrice = priceManifestEntry?.compareAtAmount != null
    ? formatAmountFromCents(priceManifestEntry.compareAtAmount, priceManifestEntry.currency)
    : product.pricing?.original_price ?? undefined;
  const resolvedPosts = resolvePosts(product, posts);
  const aboutParagraphs: string[] = [];
  if (typeof product.description === "string" && product.description.trim().length > 0) {
    aboutParagraphs.push(product.description.trim());
  }
  if (aboutParagraphs.length === 0 && typeof product.tagline === "string" && product.tagline.trim().length > 0) {
    aboutParagraphs.push(product.tagline.trim());
  }
  const about = aboutParagraphs.length > 0
    ? {
        title: "About",
        paragraphs: aboutParagraphs,
      }
    : undefined;
  const permissionJustifications =
    product.permission_justifications
      ?.map((entry) => ({
        permission: entry.permission?.trim() ?? "",
        justification: entry.justification?.trim() ?? "",
        learn_more_url: entry.learn_more_url?.trim() || undefined,
      }))
      .filter((entry) => entry.permission.length > 0 && entry.justification.length > 0) ?? undefined;

  if (!derivedOriginalPrice && currentPriceValue != null) {
    if (Math.abs(currentPriceValue - 17) < 0.01) {
      derivedOriginalPrice = formatPrice(37);
    } else if (Math.abs(currentPriceValue - 27) < 0.01) {
      derivedOriginalPrice = formatPrice(47);
    }
  }

  let pricingSubheading: string | undefined;
  if (product.pricing && Object.prototype.hasOwnProperty.call(product.pricing, "subheading")) {
    const rawSubheading = product.pricing?.subheading;
    if (typeof rawSubheading === "string") {
      const trimmed = rawSubheading.trim();
      pricingSubheading = trimmed.length > 0 ? trimmed : undefined;
    }
  }

  return {
    platform,
    videoUrl,
    heroLightThumbnailSrc: productIsPreRelease ? undefined : normalizedFeaturedImage ?? undefined,
    heroDarkThumbnailSrc: productIsPreRelease
      ? undefined
      : normalizedFeaturedImageGif ?? normalizedFeaturedImage ?? undefined,
    heroVideoTitle: `${product.name} demo video`,
    heroTitle,
    heroDescription,
    badgeText,
    ctaHref: resolvedCta.href,
    ctaText: resolvedCta.text,
    ctaTitle: `Start using ${product.name}`,
    ctaDescription: product.seo_description,
    faqs,
    screenshots,
    featureHighlights: product.features,
    testimonials,
    testimonialsHeading: testimonials ? "Reviews" : undefined,
    posts: resolvedPosts as PostItem[],
    postsTitle: resolvedPosts.length ? "Posts" : undefined,
    about,
    permissionJustifications,
    pricing: {
      enabled: true,
      heading: product.name,
      subheading: pricingSubheading,
      priceLabel: product.pricing?.label,
      price: formattedPrice,
      originalPrice: derivedOriginalPrice,
      priceNote: product.pricing?.note,
      benefits:
        product.pricing?.benefits && product.pricing.benefits.length > 0
          ? product.pricing.benefits
          : product.features && product.features.length > 0
          ? product.features.slice(0, 8) // Take first 8 features for the pricing section
          : defaultPricingBenefits,
      ctaText: resolvedCta.text,
      ctaHref: resolvedCta.href,
      id: "pricing",
  },
  cta: {
    mode: resolvedCta.mode,
    href: resolvedCta.href,
    text: resolvedCta.text,
    target: resolvedCta.target,
    rel: resolvedCta.rel,
    opensInNewTab: resolvedCta.opensInNewTab,
    analytics: resolvedCta.analytics,
  },
    ctaMode: resolvedCta.mode,
    ctaTarget: resolvedCta.target,
    ctaRel: resolvedCta.rel,
    ctaOpensInNewTab: resolvedCta.opensInNewTab,
  } satisfies Omit<HomeTemplateProps, "ui">;
}
