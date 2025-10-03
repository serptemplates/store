import { z } from "zod";

const screenshotSchema = z.object({
  url: z.string(),
  alt: z.string().optional(),
  caption: z.string().optional(),
});

const reviewSchema = z.object({
  name: z.string(),
  review: z.string(),
});

const faqSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

const stripeSchema = z.object({
  price_id: z.string(),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
  mode: z.enum(["payment", "subscription"]).optional(),
  metadata: z.record(z.string()).optional().default({}),
});

const ghlCustomFieldSchema = z.record(z.string());

const ghlSchema = z
  .object({
    pipeline_id: z.string().optional(),
    stage_id: z.string().optional(),
    status: z.string().optional(),
    source: z.string().optional(),
    tag_ids: z.array(z.string()).optional().default([]),
    workflow_ids: z.array(z.string()).optional().default([]),
    opportunity_name_template: z.string().optional(),
    contact_custom_field_ids: ghlCustomFieldSchema.optional(),
    opportunity_custom_field_ids: ghlCustomFieldSchema.optional(),
  })
  .optional();

const licenseSchema = z
  .object({
    entitlements: z
      .union([z.string().min(1), z.array(z.string().min(1)).min(1)])
      .optional(),
  })
  .optional();

const optionalExternalUrl = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z.string().url().optional(),
);

const pricingSchema = z
  .object({
    label: z.string().optional(),
    price: z.string().optional(),
    original_price: z.string().optional(),
    note: z.string().optional(),
    cta_text: z.string().optional(),
    cta_href: z.string().optional(),
    benefits: z.array(z.string()).optional().default([]),
  })
  .optional();

export const productSchema = z.object({
  slug: z.string(),
  platform: z.string().optional(),
  seo_title: z.string(),
  seo_description: z.string(),
  product_page_url: z.string().url(),
  purchase_url: z.string().url(),
  buy_button_destination: optionalExternalUrl,
  name: z.string(),
  tagline: z.string(),
  featured_image: z.string().nullable().optional(),
  featured_image_gif: z.string().nullable().optional(),
  github_repo_url: z.string().url().nullable().optional(),
  chrome_webstore_link: z.string().url().optional(),
  firefox_addon_store_link: z.string().url().nullable().optional(),
  github_repo_tags: z.array(z.string()).optional().default([]),
  features: z.array(z.string()).optional().default([]),
  description: z.string(),
  product_videos: z.array(z.string()).optional().default([]),
  related_videos: z.array(z.string()).optional().default([]),
  screenshots: z.array(screenshotSchema).optional().default([]),
  reviews: z.array(reviewSchema).optional().default([]),
  faqs: z.array(faqSchema).optional().default([]),
  supported_operating_systems: z.array(z.string()).optional().default([]),
  status: z.string().optional(),
  categories: z.array(z.string()).optional().default([]),
  keywords: z.array(z.string()).optional().default([]),
  pricing: pricingSchema,
  stripe: stripeSchema.optional(),
  ghl: ghlSchema,
  license: licenseSchema,
});

export type ProductData = z.infer<typeof productSchema>;
