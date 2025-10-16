import type { FAQ } from "@repo/ui/sections/FaqSection";
import type { PostItem } from "@repo/ui/sections/PostsSection";
import type { Screenshot } from "@repo/ui/sections/ScreenshotsCarousel";
import type { Testimonial } from "@repo/ui/sections/TestimonialMarquee";
import type { HomeTemplateProps } from "@/components/home/home-template.types";
import { titleCase } from "@/lib/string-utils";
import type { BlogPostMeta } from "@/lib/blog";
import { findPriceEntry, formatAmountFromCents } from "@/lib/pricing/price-manifest";
import type { ProductData } from "./product-schema";
import { getReleaseBadgeText } from "./release-status";
import { resolveOrderBump } from "./order-bump";

const defaultPricingBenefits = [
  "Instant access after checkout",
  "Lifetime license and updates",
  "Supports private videos",
  "Unlimited downloads included",
  "Works on macOS, Windows, and Linux"
];

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
  // If we have actual screenshots, use them
  if (screenshots?.length) {
    return screenshots.map((shot) => ({
      src: shot.url,
      alt: shot.alt,
    }));
  }

  // Otherwise, fall back to featured images if available
  const fallbackImages = [];
  if (product.featured_image) {
    fallbackImages.push({
      src: product.featured_image,
      alt: `${product.name} screenshot`,
    });
  }
  if (product.featured_image_gif && product.featured_image_gif !== product.featured_image) {
    fallbackImages.push({
      src: product.featured_image_gif,
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
  const hasExternalDestination =
    typeof product.buy_button_destination === "string" && product.buy_button_destination.trim().length > 0;
  const hasEmbeddedCheckout =
    !hasExternalDestination &&
    (Boolean(product.stripe?.price_id) || Boolean(product.stripe?.test_price_id));
  const checkoutHref = `/checkout?product=${product.slug}`;
  const allowedPrefixes = [
    "https://store.serp.co/",
    "https://ghl.serp.co/",
    "https://apps.serp.co/",
    "https://serp.ly/",
    "https://serp.co/",
  ];
  const candidateLinks = [
    product.buy_button_destination,
    product.pricing?.cta_href,
    product.store_serp_co_product_page_url,
    product.apps_serp_co_product_page_url,
    product.serp_co_product_page_url,
    product.serply_link,
  ];

  const externalCtaHref = candidateLinks.find(
    (link): link is string =>
      typeof link === "string"
      && (
        link.startsWith("/")
        || allowedPrefixes.some((prefix) => link.startsWith(prefix))
      ),
  ) ?? `https://store.serp.co/product-details/product/${product.slug}`;
  const ctaHref = hasEmbeddedCheckout ? checkoutHref : externalCtaHref;
  const ctaText = product.pricing?.cta_text ?? "Get It Now";
  const videoUrl = product.product_videos?.[0];
  const screenshots = toScreenshots(product.screenshots, product);
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

  const resolvedOrderBump = resolveOrderBump(product);
  const orderBump = resolvedOrderBump
    ? {
        id: resolvedOrderBump.id,
        title: resolvedOrderBump.title,
        description: resolvedOrderBump.description,
        price: resolvedOrderBump.priceDisplay ?? resolvedOrderBump.price,
        points: resolvedOrderBump.points,
        defaultSelected: resolvedOrderBump.defaultSelected,
      }
    : undefined;

  return {
    platform,
    videoUrl,
    heroLightThumbnailSrc: product.featured_image || undefined,
    heroDarkThumbnailSrc: (product.featured_image_gif ?? product.featured_image) || undefined,
    heroVideoTitle: `${product.name} demo video`,
    heroTitle,
    heroDescription,
    badgeText,
    ctaHref,
    ctaText,
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
      ctaText,
      ctaHref,
      id: "pricing",
      orderBump,
    },
  } satisfies Omit<HomeTemplateProps, "ui">;
}
