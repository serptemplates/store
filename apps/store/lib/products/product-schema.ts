import { z } from "zod";
import { ACCEPTED_CATEGORIES, CATEGORY_SYNONYMS } from "./category-constants";
import { inferTrademarkedBrand } from "./trademarked-brands";

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

const slugSchema = () =>
  z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, {
      message: "Slug must use lowercase letters, numbers, and hyphens only",
    });

const optionalArray = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (value) => {
      if (value === null || value === undefined) {
        return undefined;
      }
      return value;
    },
    z.array(schema).optional().default([]),
  );

const optionalIsoDate = z.preprocess(
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
  z
    .string()
    .superRefine((value, ctx) => {
      if (Number.isNaN(Date.parse(value))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Expected an ISO 8601 date string",
        });
      }
    })
    .optional(),
);

const isoCurrencyCode = z.preprocess(
  (value) => {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        return undefined;
      }
      return trimmed.toUpperCase();
    }
    return value;
  },
  z
    .string()
    .regex(/^[A-Z]{3}$/, {
      message: "Currency must be an ISO 4217 alpha code (e.g. USD)",
    })
    .optional(),
);

const stripeIdSchema = (prefixes: string[]) =>
  trimmedString().superRefine((value, ctx) => {
    if (!prefixes.some((prefix) => value.startsWith(prefix))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Expected an identifier starting with ${prefixes.join(" or ")}`,
      });
    }
  });

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
  alt: optionalTrimmedString(),
  caption: optionalTrimmedString(),
});

const externalLinkSchema = z.object({
  label: trimmedString(),
  href: trimmedString().url(),
});

const reviewSchema = z.object({
  name: trimmedString(),
  review: trimmedString(),
  title: optionalTrimmedString(),
  rating: z.number().min(0).max(5),
  date: optionalIsoDate,
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

const optionalItemSchema = z.object({
  product_id: stripeIdSchema(["prod_"]),
  quantity: z.number().int().min(1).default(1).optional(),
});

const stripeSchemaShape = {
  price_id: stripeIdSchema(["price_"]).optional(),
  test_price_id: stripeIdSchema(["price_"]).optional(),
  mode: z.enum(["payment", "subscription"]).optional(),
  metadata: z
    .preprocess(
      (value) => {
        if (value === null || value === undefined) {
          return {};
        }
        return value;
      },
      z.record(trimmedString()).default({}),
    ),
  optional_items: z.preprocess(
    (value) => {
      if (value === null || value === undefined) {
        return undefined;
      }
      return value;
    },
    z.array(optionalItemSchema).optional(),
  ),
} satisfies Record<string, z.ZodTypeAny>;

const stripeSchema = z.object(stripeSchemaShape);

const ghlCustomFieldSchema = z.record(trimmedString());

const ghlSchema = z
  .object({
    pipeline_id: optionalTrimmedString(),
    stage_id: optionalTrimmedString(),
    status: optionalTrimmedString(),
    source: optionalTrimmedString(),
    tag_ids: optionalArray(trimmedString()),
    workflow_ids: optionalArray(trimmedString()),
    opportunity_name_template: optionalTrimmedString(),
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
  currency: isoCurrencyCode,
  availability: z.string().trim().optional(),
  benefits: optionalArray(z.string().trim()),
} satisfies Record<string, z.ZodTypeAny>;

export const PRICING_FIELD_ORDER = [
  "label",
  "subheading",
  "price",
  "original_price",
  "note",
  "cta_text",
  "cta_href",
  "currency",
  "availability",
  "benefits",
] as const;
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

const trademarkMetadataSchema = z
  .object({
    uses_trademarked_brand: z.boolean().default(false),
    trade_name: optionalTrimmedString(),
    legal_entity: optionalTrimmedString(),
  })
  .superRefine((data, ctx) => {
    if (data.uses_trademarked_brand) {
      if (!data.trade_name || data.trade_name.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["trade_name"],
          message: "Provide trade_name when uses_trademarked_brand is true",
        });
      }
      if (!data.legal_entity || data.legal_entity.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["legal_entity"],
          message: "Provide legal_entity when uses_trademarked_brand is true",
        });
      }
    } else {
      if (data.trade_name && data.trade_name.trim().length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["trade_name"],
          message: "Remove trade_name when uses_trademarked_brand is false",
        });
      }
      if (data.legal_entity && data.legal_entity.trim().length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["legal_entity"],
          message: "Remove legal_entity when uses_trademarked_brand is false",
        });
      }
    }
  });

export const TRADEMARK_METADATA_FIELD_ORDER = [
  "uses_trademarked_brand",
  "trade_name",
  "legal_entity",
] as const;

export const productSchemaShape = {
  platform: z.string().trim().optional(),
  name: trimmedString(),
  tagline: trimmedString(),
  slug: slugSchema(),
  trademark_metadata: trademarkMetadataSchema,
  description: trimmedString(),
  seo_title: trimmedString(),
  seo_description: trimmedString(),
  serply_link: enforceHost(["serp.ly"]),
  store_serp_co_product_page_url: enforceHost(["store.serp.co"]),
  apps_serp_co_product_page_url: enforceHost(["apps.serp.co"]),
  serp_co_product_page_url: optionalHost(["serp.co", "www.serp.co"]),
  reddit_url: optionalHost(["www.reddit.com", "reddit.com", "old.reddit.com", "new.reddit.com", "redd.it"]),
  // buy_button_destination removed; use pricing.cta_href for CTA targeting
  success_url: successUrlSchema,
  cancel_url: cancelUrlSchema,
  status: z.enum(["draft", "pre_release", "live"]).default("draft"),
  featured_image: assetPathSchema.nullable().optional(),
  featured_image_gif: assetPathSchema.nullable().optional(),
  screenshots: optionalArray(screenshotSchema),
  product_videos: optionalArray(z.string().trim().url()),
  related_videos: optionalArray(z.string().trim().url()),
  related_posts: optionalArray(trimmedString()),
  github_repo_url: z.string().trim().url().nullable().optional(),
  github_repo_tags: optionalArray(z.string().trim()),
  chrome_webstore_link: optionalHost(["chromewebstore.google.com", "chrome.google.com"]),
  firefox_addon_store_link: optionalHost(["addons.mozilla.org"]),
  edge_addons_store_link: optionalHost(["microsoftedge.microsoft.com"]),
  opera_addons_store_link: optionalHost(["addons.opera.com"]),
  producthunt_link: optionalHost(["www.producthunt.com", "producthunt.com"]),
  resource_links: optionalArray(externalLinkSchema),
  features: optionalArray(z.string().trim()),
  pricing: pricingSchema,
  order_bump: z.any().optional().transform(() => undefined),
  faqs: optionalArray(faqSchema),
  reviews: optionalArray(reviewSchema),
  supported_operating_systems: optionalArray(z.string().trim()),
  supported_regions: optionalArray(z.string().trim()),
  categories: z.preprocess(
    (value) => {
      if (!Array.isArray(value)) {
        return value;
      }
      const all: readonly string[] = ACCEPTED_CATEGORIES as unknown as readonly string[];
      const acceptedLower = new Map(all.map((c) => [c.toLowerCase(), c] as const));
      const synonyms = CATEGORY_SYNONYMS as Record<string, string>;
      const seen = new Set<string>();
      const out: string[] = [];
      for (const v of value) {
        if (typeof v !== "string") continue;
        const lower = v.trim().toLowerCase();
        if (!lower) continue;
        const mapped = synonyms[lower] ?? acceptedLower.get(lower);
        if (mapped && !seen.has(mapped.toLowerCase())) {
          seen.add(mapped.toLowerCase());
          out.push(mapped);
        }
      }
      return out;
    },
    z.array(z.enum(ACCEPTED_CATEGORIES as unknown as [string, ...string[]])).optional().default([]),
  ),
  keywords: optionalArray(z.string().trim()),
  return_policy: returnPolicySchema,
  stripe: stripeSchema.optional(),
  ghl: ghlSchema,
  license: licenseSchema,
  layout_type: z.enum(["ecommerce", "landing", "marketplace"]).optional().default("landing"),
  featured: z.boolean().optional().default(false),
  waitlist_url: z.string().url().optional(),
  new_release: z.boolean().optional().default(false),
  popular: z.boolean().optional().default(false),
  permission_justifications: optionalArray(permissionJustificationSchema),
  brand: z.string().trim().optional().default("SERP Apps"),
  sku: optionalTrimmedString(),
} satisfies Record<string, z.ZodTypeAny>;

export const PRODUCT_FIELD_ORDER = [
  "platform",
  "name",
  "tagline",
  "slug",
  "trademark_metadata",
  "description",
  "seo_title",
  "seo_description",
  "status",
  "features",
  "faqs",
  "reviews",
  "supported_operating_systems",
  "supported_regions",
  "categories",
  "keywords",
  "layout_type",
  "featured",
  "waitlist_url",
  "new_release",
  "popular",
  "permission_justifications",
  "brand",
  "sku",
  "featured_image",
  "featured_image_gif",
  "screenshots",
  "product_videos",
  "related_videos",
  "related_posts",
  "serply_link",
  "store_serp_co_product_page_url",
  "apps_serp_co_product_page_url",
  "serp_co_product_page_url",
  "reddit_url",
  "success_url",
  "cancel_url",
  "github_repo_url",
  "github_repo_tags",
  "chrome_webstore_link",
  "firefox_addon_store_link",
  "edge_addons_store_link",
  "opera_addons_store_link",
  "producthunt_link",
  "resource_links",
  "pricing",
  "return_policy",
  "stripe",
  "ghl",
  "license",
] as const;

export const LEGAL_FAQ_TEMPLATE = {
  question: "Is this legal?",
  answer:
    [
      "<p><strong>DISCLAIMER:</strong> We are not attorneys and do not offer legal advice. Laws vary by country and platform. For any legal question please consult a qualified legal professional.</p>",
      "<p>We give you full control over download speeds because we believe users should decide how they use their software.</p>",
      "<p>That said, here are a few widely accepted best practices for safe, responsible downloading:</p>",
      "<ol>",
      "<li>Only download content you created, own, or have explicit permission from the rights holder to access.</li>",
      "<li>Protect your personal data by respecting platform rules and rate limits with reasonable download speeds to avoid automated abuse systems putting your account at risk.</li>",
      "<li>Protect your privacy by using a reputable VPN for IP protection before initiating downloads — <a href=\"https://serp.ly/best/vpn\" target=\"_blank\" rel=\"noreferrer\">this is the VPN we recommend &amp; use</a>.</li>",
      "</ol>",
    ].join("\n"),
} as const;

const LEGAL_FAQ_NORMALIZED_QUESTION = LEGAL_FAQ_TEMPLATE.question.trim().toLowerCase();

type LegalFaqContext = {
  name?: string | null;
  slug?: string | null;
  categories?: readonly string[] | null;
  keywords?: readonly string[] | null;
};

export function isDownloaderProduct(product: LegalFaqContext): boolean {
  const categories = Array.isArray(product.categories) ? product.categories : [];
  return categories.some((category) => {
    if (typeof category !== "string") {
      return false;
    }
    return category.trim().toLowerCase() === "downloader";
  });
}

export function requiresDownloaderLegalFaq(product: LegalFaqContext): boolean {
  return isDownloaderProduct(product);
}

export const productSchema = z
  .object(productSchemaShape)
  .strict()
  .superRefine((data, ctx) => {
    const detectedBrand = inferTrademarkedBrand({
      name: data.name,
      platform: data.platform,
      slug: data.slug,
      seo_title: data.seo_title,
      seo_description: data.seo_description,
      keywords: data.keywords,
    });

    if (detectedBrand && !data.trademark_metadata?.uses_trademarked_brand) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["trademark_metadata", "uses_trademarked_brand"],
        message: `Detected trademarked brand "${detectedBrand}". Set trademark_metadata.uses_trademarked_brand=true and provide trade_name/legal_entity details.`,
      });
    }

    const requiresLegalFaq = requiresDownloaderLegalFaq(data);
    const faqs = Array.isArray(data.faqs) ? data.faqs : [];
    if (requiresLegalFaq) {
      if (faqs.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["faqs"],
          message: `Products must include the \"${LEGAL_FAQ_TEMPLATE.question}\" FAQ entry.`,
        });
      } else {
        const hasLegalFaq = faqs.some((faq) => {
          const question = typeof faq?.question === "string" ? faq.question.trim().toLowerCase() : "";
          return question === LEGAL_FAQ_NORMALIZED_QUESTION;
        });
        if (!hasLegalFaq) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["faqs"],
            message: `FAQ entries must include the \"${LEGAL_FAQ_TEMPLATE.question}\" disclaimer.`,
          });
        }
      }
    }
    // Badge exclusivity rules: only one of (pre_release via status, new_release, popular)
    const isPreRelease = data.status === "pre_release";
    const isNew = Boolean((data as { new_release?: boolean }).new_release);
    const isPopular = Boolean((data as { popular?: boolean }).popular);

    if ([isPreRelease, isNew, isPopular].filter(Boolean).length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Multiple badge flags set (pre_release, new_release, popular). Only one of pre_release (status), new_release, popular is allowed.",
      });
    }

    if ((isNew || isPopular) && data.status !== "live") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "new_release/popular badges require status=live",
      });
    }

    if (data.status === "live") {
      const internalCheckoutHref = data.pricing?.cta_href as unknown;
      const hasInternalCheckout =
        typeof internalCheckoutHref === "string"
        && (
          internalCheckoutHref.startsWith("/checkout/")
          || internalCheckoutHref.startsWith("https://apps.serp.co/checkout/")
        );

      if (!hasInternalCheckout) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pricing", "cta_href"],
          message: "Live products must define an internal checkout CTA (pricing.cta_href → /checkout/:slug).",
        });
      }

      if (!data.stripe?.price_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stripe", "price_id"],
          message: "Live products must have a stripe.price_id.",
        });
      }
    }
  })
  .transform(({ order_bump: _legacyOrderBump, ...rest }) => rest);

export type ProductData = z.infer<typeof productSchema>;

export const SCREENSHOT_FIELD_ORDER = ["url", "alt", "caption"] as const;
export const FAQ_FIELD_ORDER = ["question", "answer"] as const;
export const REVIEW_FIELD_ORDER = ["name", "review", "title", "rating", "date"] as const;
export const PERMISSION_JUSTIFICATION_FIELD_ORDER = [
  "permission",
  "justification",
  "learn_more_url",
] as const;
export const STRIPE_FIELD_ORDER = ["price_id", "test_price_id", "mode", "metadata", "optional_items"] as const;
