import { z } from "zod";

const trimmedString = () => z.string().trim().min(1);

const screenshotSchema = z.object({
  url: trimmedString(),
  alt: z.string().trim().optional(),
  caption: z.string().trim().optional(),
});

const reviewSchema = z.object({
  name: trimmedString(),
  review: trimmedString(),
  title: z.string().trim().optional(),
  rating: z.number().optional(),
  date: z.string().trim().optional(),
});

const faqSchema = z.object({
  question: trimmedString(),
  answer: trimmedString(),
});

const stripeSchema = z.object({
  price_id: z.string(),
  test_price_id: z.string().optional(), // Optional test mode price ID
  success_url: trimmedString().url(),
  cancel_url: trimmedString().url(),
  mode: z.enum(["payment", "subscription"]).optional(),
  metadata: z.record(z.any()).optional().default({}),
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
    if (value === null || value === undefined) {
      return undefined;
    }
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
    label: z.string().trim().optional(),
    price: z.string().trim().optional(),
    original_price: z.string().trim().optional(),
    note: z.string().trim().optional(),
    cta_text: z.string().trim().optional(),
    cta_href: z.string().trim().optional(),
    currency: z.string().trim().optional(),
    availability: z.string().trim().optional(),
    benefits: z.array(z.string().trim()).optional().default([]),
  })
  .optional();

export const productSchema = z.object({
  slug: trimmedString(),
  platform: z.string().trim().optional(),
  seo_title: trimmedString(),
  seo_description: trimmedString(),
  product_page_url: trimmedString().url(),
  purchase_url: trimmedString().url(),
  buy_button_destination: optionalExternalUrl,
  name: trimmedString(),
  tagline: trimmedString(),
  featured_image: z.string().trim().nullable().optional(),
  featured_image_gif: z.string().trim().nullable().optional(),
  github_repo_url: z.string().trim().url().nullable().optional(),
  chrome_webstore_link: z.string().trim().url().optional(),
  firefox_addon_store_link: z.string().trim().url().nullable().optional(),
  github_repo_tags: z.array(z.string().trim()).optional().default([]),
  features: z.array(z.string().trim()).optional().default([]),
  description: trimmedString(),
  product_videos: z.array(z.string().trim()).optional().default([]),
  related_videos: z.array(z.string().trim()).optional().default([]),
  screenshots: z.array(screenshotSchema).optional().default([]),
  reviews: z.array(reviewSchema).optional().default([]),
  faqs: z.array(faqSchema).optional().default([]),
  supported_operating_systems: z.array(z.string().trim()).optional().default([]),
  status: z.string().trim().optional(),
  categories: z.array(z.string().trim()).optional().default([]),
  keywords: z.array(z.string().trim()).optional().default([]),
  pricing: pricingSchema,
  stripe: stripeSchema.optional(),
  ghl: ghlSchema,
  license: licenseSchema,
  layout_type: z.enum(["ecommerce", "landing"]).optional().default("landing"),
  // Pre-release / Waitlist fields
  pre_release: z.boolean().optional().default(false),
  waitlist_url: z.string().url().optional(),
  // New release field
  new_release: z.boolean().optional().default(false),
  // Popular badge field
  popular: z.boolean().optional().default(false),
  // Google Merchant fields
  brand: z.string().optional().default('SERP Apps'),
  sku: z.string().optional(),
});

export type ProductData = z.infer<typeof productSchema>;
