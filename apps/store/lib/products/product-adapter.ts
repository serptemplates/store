import type { FAQ } from "@repo/ui/sections/FaqSection";
import type { PostItem } from "@repo/ui/sections/PostsSection";
import type { Screenshot } from "@repo/ui/sections/ScreenshotsCarousel";
import type { Testimonial } from "@repo/ui/sections/TestimonialMarquee";
import type { HomeTemplateProps } from "@/components/home/home-template.types";
import { titleCase } from "@/lib/string-utils";
import type { ProductData } from "./product-schema";
import type { BlogPostMeta } from "@/lib/blog";

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

export function productToHomeTemplate(
  product: ProductData,
  posts: BlogPostMeta[] = []
): Omit<HomeTemplateProps, "ui"> {
  const platform = derivePlatform(product);
  const badgeText = product.status?.toUpperCase() ?? "LIVE";
  const heroTitle = product.name || product.seo_title || `${platform} Downloader`;
  const heroDescription = "";
  const hasExternalDestination =
    typeof product.buy_button_destination === "string" && product.buy_button_destination.trim().length > 0;
  const hasEmbeddedCheckout =
    !hasExternalDestination &&
    (Boolean(product.stripe?.price_id) || Boolean(product.stripe?.test_price_id));
  const checkoutHref = `/checkout?product=${product.slug}`;
  const allowedPrefixes = ["https://store.serp.co/", "https://ghl.serp.co/"];
  const candidateLinks = [
    product.buy_button_destination,
    product.pricing?.cta_href,
    product.purchase_url,
    product.product_page_url,
  ];

  const externalCtaHref = candidateLinks.find(
    (link): link is string =>
      typeof link === "string" && allowedPrefixes.some((prefix) => link.startsWith(prefix)),
  ) ?? `https://store.serp.co/products/${product.slug}`;
  const ctaHref = hasEmbeddedCheckout ? checkoutHref : externalCtaHref;
  const ctaText = product.pricing?.cta_text ?? "Get It Now";
  const videoUrl = product.product_videos?.[0];
  const screenshots = toScreenshots(product.screenshots, product);
  const testimonials = toTestimonials(product.reviews);
  const faqs = toFaqs(product.faqs);
  const currentPriceValue = parsePriceToNumber(product.pricing?.price);
  let derivedOriginalPrice = product.pricing?.original_price ?? undefined;

  if (!derivedOriginalPrice && currentPriceValue != null) {
    if (Math.abs(currentPriceValue - 17) < 0.01) {
      derivedOriginalPrice = formatPrice(37);
    } else if (Math.abs(currentPriceValue - 27) < 0.01) {
      derivedOriginalPrice = formatPrice(47);
    }
  }

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
    posts: posts as PostItem[],
    postsTitle: posts.length ? "Posts" : undefined,
    pricing: {
      enabled: true,
      heading: product.name,
      subheading: product.tagline,
      priceLabel: product.pricing?.label,
      price: product.pricing?.price,
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
    },
  } satisfies Omit<HomeTemplateProps, "ui">;
}
