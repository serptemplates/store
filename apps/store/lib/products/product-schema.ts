import { z } from "zod";

const trimmedString = () => z.string().trim().min(1);

const optionalTrimmedString = () =>
  z.preprocess(
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
    z.string().trim().optional(),
  );

const enforceHost = (hosts: string | string[]) => {
  const allowedHosts = Array.isArray(hosts) ? hosts : [hosts];
  return trimmedString()
    .url()
    .superRefine((value, ctx) => {
      try {
        const parsed = new URL(value);
        if (!allowedHosts.includes(parsed.hostname)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `URL must use host ${allowedHosts.join(", ")}`,
          });
        }
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid URL",
        });
      }
    });
};

const optionalHost = (hosts: string | string[]) =>
  z.preprocess(
    (value) => {
      if (value === null || value === undefined) {
        return undefined;
      }
      if (typeof value === "string" && value.trim().length === 0) {
        return undefined;
      }
      return value;
    },
    enforceHost(hosts).optional(),
  );

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

const assetPathSchema = trimmedString().superRefine((value, ctx) => {
  if (/^https?:\/\//i.test(value)) {
    return;
  }
  if (value.startsWith("/")) {
    return;
  }
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: "Expected an absolute URL or root-relative path",
  });
});

const screenshotSchema = z.object({
  url: assetPathSchema,
  alt: trimmedString().optional(),
  caption: trimmedString().optional(),
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

const successUrlSchema = trimmedString().superRefine((value, ctx) => {
  const sanitized = value.replaceAll("{CHECKOUT_SESSION_ID}", "checkout_session_id");

  try {
    const parsed = new URL(sanitized);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "URL must use http or https",
      });
      return;
    }

    if (!["apps.serp.co", "localhost"].includes(parsed.hostname)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "success_url must point to apps.serp.co (or localhost for development)",
      });
    }
  } catch (error) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid URL",
    });
  }
});

const cancelUrlSchema = trimmedString()
  .url()
  .superRefine((value, ctx) => {
    try {
      const parsed = new URL(value);
      if (!["apps.serp.co", "localhost"].includes(parsed.hostname)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "cancel_url must point to apps.serp.co (or localhost for development)",
        });
      }
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid URL",
      });
    }
  });

const stripeSchemaShape = {
  price_id: z.string(),
  test_price_id: z.string().optional(),
  mode: z.enum(["payment", "subscription"]).optional(),
  metadata: z
    .preprocess((value) => (value == null ? {} : value), z.record(z.any()).default({})),
} satisfies Record<string, z.ZodTypeAny>;

const stripeSchema = z.object(stripeSchemaShape);

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
    entitlements: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
  })
  .optional();

const pricingSchemaShape = {
  label: z.string().trim().optional(),
  subheading: z.string().trim().optional(),
  price: z.string().trim().optional(),
  original_price: z.string().trim().optional(),
  note: z.string().trim().optional(),
  cta_text: z.string().trim().optional(),
  cta_href: z.string().trim().optional(),
  currency: z.string().trim().optional(),
  availability: z.string().trim().optional(),
  benefits: z.array(z.string().trim()).optional().default([]),
} satisfies Record<string, z.ZodTypeAny>;

export const PRICING_FIELD_ORDER = Object.keys(pricingSchemaShape);
const pricingSchema = z.object(pricingSchemaShape).optional();

const returnPolicySchemaShape = {
  days: z.number().int().nonnegative().optional(),
  fees: z.string().trim().optional(),
  method: z.string().trim().optional(),
  policy_category: z.string().trim().optional(),
  url: z.string().trim().url().optional(),
} satisfies Record<string, z.ZodTypeAny>;

export const RETURN_POLICY_FIELD_ORDER = Object.keys(returnPolicySchemaShape);
const returnPolicySchema = z.object(returnPolicySchemaShape).optional();

const permissionJustificationSchema = z.object({
  permission: trimmedString(),
  justification: trimmedString(),
  learn_more_url: trimmedString().url().optional(),
});

const paymentLinkSchema = z
  .union([
    z
      .object({
        live_url: enforceHost("buy.stripe.com"),
        test_url: enforceHost("buy.stripe.com").optional(),
      })
      .strict(),
    z
      .object({
        ghl_url: enforceHost("ghl.serp.co"),
      })
      .strict(),
  ])
  .optional();

export const productSchemaShape = {
  platform: z.string().trim().optional(),
  name: trimmedString(),
  tagline: trimmedString(),
  slug: trimmedString(),
  description: trimmedString(),
  seo_title: trimmedString(),
  seo_description: trimmedString(),
  serply_link: enforceHost(["serp.ly"]),
  store_serp_co_product_page_url: enforceHost(["store.serp.co"]),
  apps_serp_co_product_page_url: enforceHost(["apps.serp.co"]),
  serp_co_product_page_url: optionalHost(["serp.co", "www.serp.co"]),
  buy_button_destination: optionalExternalUrl,
  success_url: successUrlSchema,
  cancel_url: cancelUrlSchema,
  status: z.enum(["draft", "pre_release", "live"]).default("draft"),
  featured_image: assetPathSchema.nullable().optional(),
  featured_image_gif: assetPathSchema.nullable().optional(),
  screenshots: z.array(screenshotSchema).optional().default([]),
  product_videos: z.array(z.string().trim()).optional().default([]),
  related_videos: z.array(z.string().trim()).optional().default([]),
  related_posts: z.array(trimmedString()).optional().default([]),
  github_repo_url: z.string().trim().url().nullable().optional(),
  github_repo_tags: z.array(z.string().trim()).optional().default([]),
  chrome_webstore_link: optionalHost(["chromewebstore.google.com", "chrome.google.com"]),
  firefox_addon_store_link: optionalHost(["addons.mozilla.org"]),
  edge_addons_store_link: optionalHost(["microsoftedge.microsoft.com"]),
  opera_addons_store_link: optionalHost(["addons.opera.com"]),
  producthunt_link: optionalHost(["www.producthunt.com", "producthunt.com"]),
  features: z.array(z.string().trim()).optional().default([]),
  pricing: pricingSchema,
  order_bump: z.any().optional().transform(() => undefined),
  faqs: z.array(faqSchema).optional().default([]),
  reviews: z.array(reviewSchema).optional().default([]),
  supported_operating_systems: z.array(z.string().trim()).optional().default([]),
  supported_regions: z.array(z.string().trim()).optional().default([]),
  categories: z.array(z.string().trim()).optional().default([]),
  keywords: z.array(z.string().trim()).optional().default([]),
  return_policy: returnPolicySchema,
  payment_link: paymentLinkSchema,
  stripe: stripeSchema.optional(),
  ghl: ghlSchema,
  license: licenseSchema,
  layout_type: z.enum(["ecommerce", "landing", "marketplace"]).optional().default("landing"),
  featured: z.boolean().optional().default(false),
  waitlist_url: z.string().url().optional(),
  new_release: z.boolean().optional().default(false),
  popular: z.boolean().optional().default(false),
  permission_justifications: z.array(permissionJustificationSchema).optional().default([]),
  brand: z.string().optional().default("SERP Apps"),
  sku: z.string().optional(),
} satisfies Record<string, z.ZodTypeAny>;

export const PRODUCT_FIELD_ORDER = [
  "platform",
  "name",
  "tagline",
  "slug",
  "description",
  "seo_title",
  "seo_description",
  "serply_link",
  "store_serp_co_product_page_url",
  "apps_serp_co_product_page_url",
  "serp_co_product_page_url",
  "buy_button_destination",
  "success_url",
  "cancel_url",
  "status",
  "featured_image",
  "featured_image_gif",
  "screenshots",
  "product_videos",
  "related_videos",
  "related_posts",
  "github_repo_url",
  "github_repo_tags",
  "chrome_webstore_link",
  "firefox_addon_store_link",
  "edge_addons_store_link",
  "opera_addons_store_link",
  "producthunt_link",
  "features",
  "pricing",
  "faqs",
  "reviews",
  "supported_operating_systems",
  "supported_regions",
  "categories",
  "keywords",
  "return_policy",
  "payment_link",
  "stripe",
  "ghl",
  "license",
  "layout_type",
  "featured",
  "waitlist_url",
  "new_release",
  "popular",
  "permission_justifications",
  "brand",
  "sku",
] as const;

export const productSchema = z
  .object(productSchemaShape)
  .strict()
  .superRefine((data, ctx) => {
    if (data.status === "live") {
      const link = data.payment_link;
      const hasStripeLink =
        link != null &&
        "live_url" in link &&
        typeof link.live_url === "string" &&
        link.live_url.trim().length > 0;
      const hasGhlLink =
        link != null &&
        "ghl_url" in link &&
        typeof link.ghl_url === "string" &&
        link.ghl_url.trim().length > 0;

      if (!hasStripeLink && !hasGhlLink) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["payment_link"],
          message:
            "Products with status 'live' must define a Stripe payment link (live/test) or a GoHighLevel payment link.",
        });
      }
    }
  })
  .transform(({ order_bump: _legacyOrderBump, ...rest }) => rest);

export type ProductData = z.infer<typeof productSchema>;
