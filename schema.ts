import { z } from 'zod';

// Zod Schema
export const ProductSchema = z.object({
  id: z.number(),
  created_at: z.string(),
  seo_title: z.string().nullable().optional(),
  seo_description: z.string().nullable().optional(),
  product_page_url: z.string().url().nullable().optional(),
  purchase_url: z.string().url().nullable().optional(),
  store_product_id: z.number().nullable().optional(),
  name: z.string(),
  tagline: z.string(),
  featured_image: z.string().nullable().optional(),
  featured_image_gif: z.string().nullable().optional(),
  github_repo_url: z.string().url().nullable().optional(),
  github_repo_tags: z.array(z.string()).nullable().optional(),
  github_gist_url: z.string().url().nullable().optional(),
  features: z.array(z.string()),
  chrome_web_store_url: z.string().url().nullable().optional(),
  description: z.string(),
  product_video: z.array(z.string()).nullable().optional(),
  related_videos: z.array(z.string()).nullable().optional(),
  changelog: z.string().nullable().optional(),
  version_number: z.number(),
  updated_at: z.string(),
  troubleshooting_instructions: z.array(z.string()),
  installation_instructions: z.string(),
  usage_instructions: z.array(z.string()),
  faqs: z.array(z.object({
    question: z.string(),
    answer: z.string()
  })).nullable().optional(),
  supported_operating_systems: z.array(z.enum(['windows', 'macos', 'linux', 'android', 'ios'])).nullable().optional(),
  status: z.enum(['live', 'coming_soon', 'planned', 'deprecated']).default('live'),
  technologies: z.array(z.string()).nullable().optional(),
  serpco_product_page_link: z.string().nullable().optional(),
  serpai_product_page_link: z.string().nullable().optional(),
  file_formats: z.array(z.string()).nullable().optional(),
  categories: z.array(z.string()).nullable().optional(),
  extraction_targets: z.array(z.string()).nullable().optional(),
  content_medium: z.array(z.string()).nullable().optional(),
  discovery_source: z.array(z.string()).nullable().optional(),
  related_articles: z.array(z.string()).nullable().optional(),
  related_gists: z.array(z.string()).nullable().optional(),
  funding_links_github: z.array(z.string()).nullable().optional(),
  funding_links_liberapay: z.array(z.string()).nullable().optional(),
  funding_links_opencollective: z.array(z.string()).nullable().optional(),
  funding_links_custom: z.array(z.string()).nullable().optional(),
  keywords: z.array(z.string()).nullable().optional(),
});

export const ProductsSchema = z.array(ProductSchema);

// TypeScript Type (inferred from Zod)
export type Product = z.infer<typeof ProductSchema>;
export type Products = z.infer<typeof ProductsSchema>;
