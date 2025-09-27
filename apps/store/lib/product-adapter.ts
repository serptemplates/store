import type { HomeTemplateProps, FAQ, PostItem } from "@repo/templates";
import type { Screenshot } from "@repo/ui/sections/ScreenshotsCarousel";
import type { Testimonial } from "@repo/ui/sections/TestimonialMarquee";
import { titleCase } from "./string-utils";
import type { ProductData } from "./product-schema";
import type { BlogPostMeta } from "./blog";

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

export function productToHomeTemplate(
  product: ProductData,
  posts: BlogPostMeta[] = []
): Omit<HomeTemplateProps, "ui"> {
  const platform = derivePlatform(product);
  const badgeText = product.status?.toUpperCase() ?? "LIVE";
  const heroTitle = product.name || product.seo_title || `${platform} Downloader`;
  const heroDescription = product.tagline || product.seo_description;
  const ctaHref = product.pricing?.cta_href ?? "#pricing";
  const ctaText = product.pricing?.cta_text ?? "Checkout";
  const videoUrl = product.product_videos?.[0];
  const screenshots = toScreenshots(product.screenshots, product);
  const testimonials = toTestimonials(product.reviews);
  const faqs = toFaqs(product.faqs);

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
      originalPrice: product.pricing?.original_price,
      priceNote: product.pricing?.note,
      benefits:
        product.pricing?.benefits && product.pricing.benefits.length > 0
          ? product.pricing.benefits
          : defaultPricingBenefits,
      ctaText,
      ctaHref,
      id: "pricing",
    },
  } satisfies Omit<HomeTemplateProps, "ui">;
}
