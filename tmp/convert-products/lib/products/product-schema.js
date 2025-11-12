"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STRIPE_FIELD_ORDER = exports.PERMISSION_JUSTIFICATION_FIELD_ORDER = exports.REVIEW_FIELD_ORDER = exports.FAQ_FIELD_ORDER = exports.SCREENSHOT_FIELD_ORDER = exports.productSchema = exports.LEGAL_FAQ_TEMPLATE = exports.PRODUCT_FIELD_ORDER = exports.productSchemaShape = exports.TRADEMARK_METADATA_FIELD_ORDER = exports.RETURN_POLICY_FIELD_ORDER = exports.PRICING_FIELD_ORDER = void 0;
const zod_1 = require("zod");
const category_constants_1 = require("./category-constants");
const trademarked_brands_1 = require("./trademarked-brands");
const trimmedString = () => zod_1.z.string().trim().min(1);
const optionalTrimmedString = () => zod_1.z.preprocess((value) => {
    if (value === null || value === undefined) {
        return undefined;
    }
    if (typeof value !== "string") {
        return value;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
}, zod_1.z.string().trim().optional());
const enforceHost = (hosts) => {
    const allowedHosts = Array.isArray(hosts) ? hosts : [hosts];
    return trimmedString()
        .url()
        .superRefine((value, ctx) => {
        try {
            const parsed = new URL(value);
            if (!allowedHosts.includes(parsed.hostname)) {
                ctx.addIssue({
                    code: zod_1.z.ZodIssueCode.custom,
                    message: `URL must use host ${allowedHosts.join(", ")}`,
                });
            }
        }
        catch (error) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: "Invalid URL",
            });
        }
    });
};
const optionalHost = (hosts) => zod_1.z.preprocess((value) => {
    if (value === null || value === undefined) {
        return undefined;
    }
    if (typeof value === "string" && value.trim().length === 0) {
        return undefined;
    }
    return value;
}, enforceHost(hosts).optional());
const optionalExternalUrl = zod_1.z.preprocess((value) => {
    if (value === null || value === undefined) {
        return undefined;
    }
    if (typeof value !== "string") {
        return value;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
}, zod_1.z.string().url().optional());
const slugSchema = () => zod_1.z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, {
    message: "Slug must use lowercase letters, numbers, and hyphens only",
});
const optionalArray = (schema) => zod_1.z.preprocess((value) => {
    if (value === null || value === undefined) {
        return undefined;
    }
    return value;
}, zod_1.z.array(schema).optional().default([]));
const optionalIsoDate = zod_1.z.preprocess((value) => {
    if (value === null || value === undefined) {
        return undefined;
    }
    if (typeof value !== "string") {
        return value;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
}, zod_1.z
    .string()
    .superRefine((value, ctx) => {
    if (Number.isNaN(Date.parse(value))) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "Expected an ISO 8601 date string",
        });
    }
})
    .optional());
const isoCurrencyCode = zod_1.z.preprocess((value) => {
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
}, zod_1.z
    .string()
    .regex(/^[A-Z]{3}$/, {
    message: "Currency must be an ISO 4217 alpha code (e.g. USD)",
})
    .optional());
const stripeIdSchema = (prefixes) => trimmedString().superRefine((value, ctx) => {
    if (!prefixes.some((prefix) => value.startsWith(prefix))) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
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
        code: zod_1.z.ZodIssueCode.custom,
        message: "Expected an absolute URL or root-relative path",
    });
});
const screenshotSchema = zod_1.z.object({
    url: assetPathSchema,
    alt: optionalTrimmedString(),
    caption: optionalTrimmedString(),
});
const externalLinkSchema = zod_1.z.object({
    label: trimmedString(),
    href: trimmedString().url(),
});
const reviewSchema = zod_1.z.object({
    name: trimmedString(),
    review: trimmedString(),
    title: optionalTrimmedString(),
    rating: zod_1.z.number().min(0).max(5),
    date: optionalIsoDate,
});
const faqSchema = zod_1.z.object({
    question: trimmedString(),
    answer: trimmedString(),
});
const successUrlSchema = trimmedString().superRefine((value, ctx) => {
    const sanitized = value.replaceAll("{CHECKOUT_SESSION_ID}", "checkout_session_id");
    try {
        const parsed = new URL(sanitized);
        if (!["http:", "https:"].includes(parsed.protocol)) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: "URL must use http or https",
            });
            return;
        }
        if (!["apps.serp.co", "localhost"].includes(parsed.hostname)) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: "success_url must point to apps.serp.co (or localhost for development)",
            });
        }
    }
    catch (error) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
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
                code: zod_1.z.ZodIssueCode.custom,
                message: "cancel_url must point to apps.serp.co (or localhost for development)",
            });
        }
    }
    catch (error) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "Invalid URL",
        });
    }
});
const stripeSchemaShape = {
    price_id: stripeIdSchema(["price_"]),
    test_price_id: stripeIdSchema(["price_"]).optional(),
    mode: zod_1.z.enum(["payment", "subscription"]).optional(),
    metadata: zod_1.z
        .preprocess((value) => {
        if (value === null || value === undefined) {
            return {};
        }
        return value;
    }, zod_1.z.record(trimmedString()).default({})),
};
const stripeSchema = zod_1.z.object(stripeSchemaShape);
const ghlCustomFieldSchema = zod_1.z.record(trimmedString());
const ghlSchema = zod_1.z
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
const licenseSchema = zod_1.z
    .object({
    entitlements: zod_1.z.union([zod_1.z.string().min(1), zod_1.z.array(zod_1.z.string().min(1)).min(1)]).optional(),
})
    .optional();
const pricingSchemaShape = {
    label: zod_1.z.string().trim().optional(),
    subheading: zod_1.z.string().trim().optional(),
    price: zod_1.z.string().trim().optional(),
    original_price: zod_1.z.string().trim().optional(),
    note: zod_1.z.string().trim().optional(),
    cta_text: zod_1.z.string().trim().optional(),
    cta_href: zod_1.z.string().trim().optional(),
    currency: isoCurrencyCode,
    availability: zod_1.z.string().trim().optional(),
    benefits: optionalArray(zod_1.z.string().trim()),
};
exports.PRICING_FIELD_ORDER = [
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
];
const pricingSchema = zod_1.z.object(pricingSchemaShape).optional();
const returnPolicySchemaShape = {
    days: zod_1.z.number().int().nonnegative().optional(),
    fees: zod_1.z.string().trim().optional(),
    method: zod_1.z.string().trim().optional(),
    policy_category: zod_1.z.string().trim().optional(),
    url: zod_1.z.string().trim().url().optional(),
};
exports.RETURN_POLICY_FIELD_ORDER = Object.keys(returnPolicySchemaShape);
const returnPolicySchema = zod_1.z.object(returnPolicySchemaShape).optional();
const permissionJustificationSchema = zod_1.z.object({
    permission: trimmedString(),
    justification: trimmedString(),
    learn_more_url: trimmedString().url().optional(),
});
const trademarkMetadataSchema = zod_1.z
    .object({
    uses_trademarked_brand: zod_1.z.boolean().default(false),
    trade_name: optionalTrimmedString(),
    legal_entity: optionalTrimmedString(),
})
    .superRefine((data, ctx) => {
    if (data.uses_trademarked_brand) {
        if (!data.trade_name || data.trade_name.trim().length === 0) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ["trade_name"],
                message: "Provide trade_name when uses_trademarked_brand is true",
            });
        }
        if (!data.legal_entity || data.legal_entity.trim().length === 0) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ["legal_entity"],
                message: "Provide legal_entity when uses_trademarked_brand is true",
            });
        }
    }
    else {
        if (data.trade_name && data.trade_name.trim().length > 0) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ["trade_name"],
                message: "Remove trade_name when uses_trademarked_brand is false",
            });
        }
        if (data.legal_entity && data.legal_entity.trim().length > 0) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ["legal_entity"],
                message: "Remove legal_entity when uses_trademarked_brand is false",
            });
        }
    }
});
exports.TRADEMARK_METADATA_FIELD_ORDER = [
    "uses_trademarked_brand",
    "trade_name",
    "legal_entity",
];
exports.productSchemaShape = {
    platform: zod_1.z.string().trim().optional(),
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
    status: zod_1.z.enum(["draft", "pre_release", "live"]).default("draft"),
    featured_image: assetPathSchema.nullable().optional(),
    featured_image_gif: assetPathSchema.nullable().optional(),
    screenshots: optionalArray(screenshotSchema),
    product_videos: optionalArray(zod_1.z.string().trim().url()),
    related_videos: optionalArray(zod_1.z.string().trim().url()),
    related_posts: optionalArray(trimmedString()),
    github_repo_url: zod_1.z.string().trim().url().nullable().optional(),
    github_repo_tags: optionalArray(zod_1.z.string().trim()),
    chrome_webstore_link: optionalHost(["chromewebstore.google.com", "chrome.google.com"]),
    firefox_addon_store_link: optionalHost(["addons.mozilla.org"]),
    edge_addons_store_link: optionalHost(["microsoftedge.microsoft.com"]),
    opera_addons_store_link: optionalHost(["addons.opera.com"]),
    producthunt_link: optionalHost(["www.producthunt.com", "producthunt.com"]),
    resource_links: optionalArray(externalLinkSchema),
    features: optionalArray(zod_1.z.string().trim()),
    pricing: pricingSchema,
    order_bump: zod_1.z.any().optional().transform(() => undefined),
    faqs: optionalArray(faqSchema),
    reviews: optionalArray(reviewSchema),
    supported_operating_systems: optionalArray(zod_1.z.string().trim()),
    supported_regions: optionalArray(zod_1.z.string().trim()),
    categories: zod_1.z.preprocess((value) => {
        if (!Array.isArray(value)) {
            return value;
        }
        const all = category_constants_1.ACCEPTED_CATEGORIES;
        const acceptedLower = new Map(all.map((c) => [c.toLowerCase(), c]));
        const synonyms = category_constants_1.CATEGORY_SYNONYMS;
        const seen = new Set();
        const out = [];
        for (const v of value) {
            if (typeof v !== "string")
                continue;
            const lower = v.trim().toLowerCase();
            if (!lower)
                continue;
            const mapped = synonyms[lower] ?? acceptedLower.get(lower);
            if (mapped && !seen.has(mapped.toLowerCase())) {
                seen.add(mapped.toLowerCase());
                out.push(mapped);
            }
        }
        return out;
    }, zod_1.z.array(zod_1.z.enum(category_constants_1.ACCEPTED_CATEGORIES)).optional().default([])),
    keywords: optionalArray(zod_1.z.string().trim()),
    return_policy: returnPolicySchema,
    stripe: stripeSchema.optional(),
    ghl: ghlSchema,
    license: licenseSchema,
    layout_type: zod_1.z.enum(["ecommerce", "landing", "marketplace"]).optional().default("landing"),
    featured: zod_1.z.boolean().optional().default(false),
    waitlist_url: zod_1.z.string().url().optional(),
    new_release: zod_1.z.boolean().optional().default(false),
    popular: zod_1.z.boolean().optional().default(false),
    permission_justifications: optionalArray(permissionJustificationSchema),
    brand: zod_1.z.string().trim().optional().default("SERP Apps"),
    sku: optionalTrimmedString(),
};
exports.PRODUCT_FIELD_ORDER = [
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
];
exports.LEGAL_FAQ_TEMPLATE = {
    question: "Is this legal?",
    answer: [
        "<p><strong>DISCLAIMER:</strong> We are not attorneys and do not offer legal advice. Laws vary by country and platform. For any legal question please consult a qualified legal professional.</p>",
        "<p>We give you full control over download speeds because we believe users should decide how they use their software.</p>",
        "<p>That said, here are a few widely accepted best practices for safe, responsible downloading:</p>",
        "<ol>",
        "<li>Only download content you created, own, or have explicit permission from the rights holder to access.</li>",
        "<li>Protect your personal data by respecting platform rules and rate limits with reasonable download speeds to avoid automated abuse systems putting your account at risk.</li>",
        "<li>Protect your privacy by using a reputable VPN for IP protection before initiating downloads — <a href=\"https://serp.ly/best/vpn\" target=\"_blank\" rel=\"noreferrer\">this is the VPN we recommend &amp; use</a>.</li>",
        "</ol>",
    ].join("\n"),
};
const LEGAL_FAQ_NORMALIZED_QUESTION = exports.LEGAL_FAQ_TEMPLATE.question.trim().toLowerCase();
exports.productSchema = zod_1.z
    .object(exports.productSchemaShape)
    .strict()
    .superRefine((data, ctx) => {
    const detectedBrand = (0, trademarked_brands_1.inferTrademarkedBrand)({
        name: data.name,
        platform: data.platform,
        slug: data.slug,
        seo_title: data.seo_title,
        seo_description: data.seo_description,
        keywords: data.keywords,
    });
    if (detectedBrand && !data.trademark_metadata?.uses_trademarked_brand) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["trademark_metadata", "uses_trademarked_brand"],
            message: `Detected trademarked brand "${detectedBrand}". Set trademark_metadata.uses_trademarked_brand=true and provide trade_name/legal_entity details.`,
        });
    }
    const faqs = Array.isArray(data.faqs) ? data.faqs : [];
    if (faqs.length === 0) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["faqs"],
            message: `Products must include the \"${exports.LEGAL_FAQ_TEMPLATE.question}\" FAQ entry.`,
        });
    }
    else {
        const hasLegalFaq = faqs.some((faq) => {
            const question = typeof faq?.question === "string" ? faq.question.trim().toLowerCase() : "";
            return question === LEGAL_FAQ_NORMALIZED_QUESTION;
        });
        if (!hasLegalFaq) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ["faqs"],
                message: `FAQ entries must include the \"${exports.LEGAL_FAQ_TEMPLATE.question}\" disclaimer.`,
            });
        }
    }
    // Badge exclusivity rules: only one of (pre_release via status, new_release, popular)
    const isPreRelease = data.status === "pre_release";
    const isNew = Boolean(data.new_release);
    const isPopular = Boolean(data.popular);
    if ([isPreRelease, isNew, isPopular].filter(Boolean).length > 1) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "Multiple badge flags set (pre_release, new_release, popular). Only one of pre_release (status), new_release, popular is allowed.",
        });
    }
    if ((isNew || isPopular) && data.status !== "live") {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "new_release/popular badges require status=live",
        });
    }
    if (data.status === "live") {
        const internalCheckoutHref = data.pricing?.cta_href;
        const hasInternalCheckout = typeof internalCheckoutHref === "string"
            && (internalCheckoutHref.startsWith("/checkout/")
                || internalCheckoutHref.startsWith("https://apps.serp.co/checkout/"));
        if (!hasInternalCheckout) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ["pricing", "cta_href"],
                message: "Live products must define an internal checkout CTA (pricing.cta_href → /checkout/:slug).",
            });
        }
    }
})
    .transform(({ order_bump: _legacyOrderBump, ...rest }) => rest);
exports.SCREENSHOT_FIELD_ORDER = ["url", "alt", "caption"];
exports.FAQ_FIELD_ORDER = ["question", "answer"];
exports.REVIEW_FIELD_ORDER = ["name", "review", "title", "rating", "date"];
exports.PERMISSION_JUSTIFICATION_FIELD_ORDER = [
    "permission",
    "justification",
    "learn_more_url",
];
exports.STRIPE_FIELD_ORDER = ["price_id", "test_price_id", "mode", "metadata"];
