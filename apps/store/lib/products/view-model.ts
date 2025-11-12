import type { ProductData } from "./product-schema";
import { LEGAL_FAQ_TEMPLATE } from "./product-schema";

export type ProductCopy = {
  subtitle: string;
  featuresTitle: string;
  featuresDescription: string;
  aboutParagraphs: string[];
};

export type ProductPermissionEntry = {
  id: string;
  question: string;
  answer: string;
  learnMoreUrl?: string;
};

export type ProductReviewEntry = {
  id: string;
  name: string;
  title?: string;
  rating?: number;
  date?: string;
  review: string;
};

export type ProductFaqEntry = {
  id: string;
  question: string;
  answer: string;
};

export type ProductResourceLink = {
  label: string;
  href: string;
};

export type ProductMetadata = {
  categories: string[];
  supportedLanguages: string[];
  operatingSystems: string[];
  resourceLinks: ProductResourceLink[];
};

const DEFAULT_COPY_FALLBACK = "This app";

export function buildProductCopy(product: ProductData): ProductCopy {
  const appName = product.name ?? product.platform ?? DEFAULT_COPY_FALLBACK;
  const rawDescription = typeof product.description === "string" ? product.description.trim() : "";
  const descriptionParagraphs = rawDescription.length > 0 ? rawDescription.split(/\n\s*\n/) : [];
  const tagline = typeof product.tagline === "string" ? product.tagline.trim() : "";
  const seoDescription = typeof product.seo_description === "string" ? product.seo_description.trim() : "";

  const subtitle = tagline || descriptionParagraphs[0] || seoDescription || appName;
  const featuresTitle = tagline || appName;
  const featuresDescription = descriptionParagraphs[0] || tagline || seoDescription || appName;
  const aboutParagraphs = descriptionParagraphs.slice(1).filter((paragraph) => paragraph.trim().length > 0);

  return {
    subtitle,
    featuresTitle,
    featuresDescription,
    aboutParagraphs,
  };
}

export function buildPermissionEntries(product: ProductData): ProductPermissionEntry[] {
  const entries = product.permission_justifications ?? [];
  const result: ProductPermissionEntry[] = [];

  entries.forEach((entry, index) => {
    const permission = entry.permission?.trim() ?? "";
    const justification = entry.justification?.trim() ?? "";
    if (!permission || !justification) {
      return;
    }
    const learnMore = entry.learn_more_url?.trim() || undefined;
    result.push({
      id: createAccordionItemId(permission, index, "permission"),
      question: permission,
      answer: justification,
      learnMoreUrl: learnMore,
    });
  });

  return result;
}

export function buildFaqEntries(product: ProductData): ProductFaqEntry[] {
  return (
    product.faqs
      ?.map((faq, index) => {
        const question = faq.question?.trim();
        const answer = faq.answer?.trim();
        if (!question || !answer) {
          return null;
        }

        const normalizedQuestion = question.toLowerCase();
        const legalQuestion = LEGAL_FAQ_TEMPLATE.question.trim().toLowerCase();
        const resolvedAnswer = normalizedQuestion === legalQuestion ? LEGAL_FAQ_TEMPLATE.answer : answer;

        return {
          id: createAccordionItemId(question, index, "faq"),
          question,
          answer: resolvedAnswer,
        };
      })
      .filter((entry): entry is ProductFaqEntry => Boolean(entry)) ?? []
  );
}

export function buildReviewEntries(product: ProductData): ProductReviewEntry[] {
  const reviews = product.reviews ?? [];
  const result: ProductReviewEntry[] = [];

  reviews.forEach((review, index) => {
    const name = review.name?.trim();
    const reviewBody = review.review?.trim();

    if (!name || !reviewBody) {
      return;
    }

    result.push({
      id: `${name}-${index}`,
      name,
      title: review.title?.trim() || undefined,
      rating: review.rating ?? undefined,
      date: review.date ?? undefined,
      review: reviewBody,
    });
  });

  return result;
}

export function buildProductMetadata(product: ProductData): ProductMetadata {
  return {
    categories: collectCategories(product),
    supportedLanguages: collectSupportedLanguages(product),
    operatingSystems: collectOperatingSystems(product),
    resourceLinks: buildProductResourceLinks(product),
  };
}

export function buildProductResourceLinks(product: ProductData): ProductResourceLink[] {
  const links: ProductResourceLink[] = [];
  const seen = new Set<string>();

  const appendLink = (value: unknown, label: string) => {
    if (typeof value !== "string") {
      return;
    }

    const trimmed = value.trim();
    if (!trimmed || seen.has(`${label}:::${trimmed}`)) {
      return;
    }

    seen.add(`${label}:::${trimmed}`);
    links.push({ label, href: trimmed });
  };

  appendLink(product.serp_co_product_page_url, "SERP");
  appendLink(product.reddit_url, "Reddit");
  appendLink(product.github_repo_url, "GitHub");
  appendLink(product.chrome_webstore_link, "Chrome Web Store");
  appendLink(product.firefox_addon_store_link, "Firefox Add-ons");
  appendLink(product.edge_addons_store_link, "Microsoft Edge Add-ons");
  appendLink(product.opera_addons_store_link, "Opera Add-ons");
  appendLink(product.producthunt_link, "Product Hunt");

  if (Array.isArray(product.resource_links)) {
    product.resource_links.forEach((link) => {
      const label = typeof link?.label === "string" ? link.label.trim() : "";
      const href = typeof link?.href === "string" ? link.href.trim() : "";
      if (label && href) {
        appendLink(href, label);
      }
    });
  }

  return links;
}

export function formatOperatingSystemLabel(value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return normalized;
  }

  const lower = normalized.toLowerCase();
  const overrides: Record<string, string> = {
    ios: "iOS",
    macos: "macOS",
    windows: "Windows",
    mac: "Mac",
    linux: "Linux",
    android: "Android",
    chrome: "Chrome",
    firefox: "Firefox",
    edge: "Edge",
    opera: "Opera",
  };

  if (overrides[lower]) {
    return overrides[lower];
  }

  return normalized
    .split(/[\s_-]+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function collectCategories(product: ProductData): string[] {
  return (
    product.categories
      ?.map((category) => category.trim())
      .filter((category) => category.length > 0) ?? []
  );
}

function collectSupportedLanguages(product: ProductData): string[] {
  const maybe = (product as { supported_languages?: unknown }).supported_languages;
  if (!Array.isArray(maybe)) {
    return [];
  }

  return maybe
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);
}

function collectOperatingSystems(product: ProductData): string[] {
  if (!Array.isArray(product.supported_operating_systems)) {
    return [];
  }

  return product.supported_operating_systems
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);
}

function createAccordionItemId(rawValue: string | null | undefined, index: number, prefix: string): string {
  const baseValue = typeof rawValue === "string" ? rawValue : "";
  const stripped = baseValue
    .normalize("NFKD")
    .replace(/[\u0300-\u036F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (stripped.length === 0) {
    return `${prefix}-${index}`;
  }
  return `${prefix}-${stripped}-${index}`;
}
