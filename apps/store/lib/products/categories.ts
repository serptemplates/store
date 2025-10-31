import { CATEGORY_RULES, PRIMARY_CATEGORIES } from "./category-constants";
import type { ProductData } from "./product-schema";

const PRIMARY_CATEGORY_ORDER = new Map(
  PRIMARY_CATEGORIES.map((label, index) => [label.toLowerCase(), index] as const),
);

const PRIMARY_CATEGORY_CANONICAL_LABELS = new Map(
  PRIMARY_CATEGORIES.map((label) => [label.toLowerCase(), label] as const),
);

const CATEGORY_LABEL_OVERRIDES = new Map<string, string>([
  ["image downloader", "Image Downloaders"],
  ["image downloaders", "Image Downloaders"],
  ["audio downloader", "Audio Downloaders"],
  ["audio downloaders", "Audio Downloaders"],
  ["video downloader", "Video Downloaders"],
  ["video downloaders", "Video Downloaders"],
]);

const CATEGORY_SLUG_ALIASES = new Map<string, string>([
  ["image-downloader", "Image Downloaders"],
  ["audio-downloader", "Audio Downloaders"],
  ["video-downloader", "Video Downloaders"],
]);

function normalizeCategoryLabel(label: string): string {
  return label.trim();
}

export function canonicalizeCategoryLabel(label: string): string {
  const normalized = normalizeCategoryLabel(label);
  const lower = normalized.toLowerCase();
  const override = CATEGORY_LABEL_OVERRIDES.get(lower);
  if (override) {
    return override;
  }

  const canonical = PRIMARY_CATEGORY_CANONICAL_LABELS.get(lower);
  return canonical ?? normalized;
}

export function slugifyCategoryLabel(label: string): string {
  return canonicalizeCategoryLabel(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function deriveProductCategories(product: ProductData): string[] {
  if (product.categories && product.categories.length > 0) {
    const validCategories = product.categories.filter((cat) => {
      if (typeof cat !== "string") {
        return false;
      }
      const lower = cat.toLowerCase();
      return (
        lower !== (product.name ?? "").toLowerCase() &&
        lower !== (product.platform ?? "").toLowerCase()
      );
    });

    if (validCategories.length > 0) {
      const seen = new Set<string>();
      const primary: string[] = [];
      const additional: string[] = [];

      validCategories.forEach((category) => {
        const canonical = canonicalizeCategoryLabel(category);
        const lower = canonical.toLowerCase();
        if (seen.has(lower)) return;
        seen.add(lower);
        if (PRIMARY_CATEGORY_ORDER.has(lower)) {
          primary.push(canonical);
        } else {
          additional.push(canonical);
        }
      });

      primary.sort((a, b) => {
        const aIndex = PRIMARY_CATEGORY_ORDER.get(a.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
        const bIndex = PRIMARY_CATEGORY_ORDER.get(b.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
        return aIndex - bIndex;
      });

      return [...primary, ...additional];
    }
  }

  const haystack = [product.slug, product.platform, ...(product.keywords ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const derived = new Set<string>();

  CATEGORY_RULES.forEach((rule) => {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      derived.add(rule.label);
    }
  });

  const addCategory = (label: string) => derived.add(canonicalizeCategoryLabel(label));

  if (derived.size === 0) {
    const slug = (product.slug ?? "").toLowerCase();
    const name = (product.name ?? "").toLowerCase();

    if (slug.includes("ai-") || name.includes("ai ")) {
      addCategory("Artificial Intelligence");
    }

    if (slug.includes("live") || slug.includes("stream") || name.includes("stream")) {
      addCategory("Livestream");
    }

    if (
      slug.includes("movie") ||
      slug.includes("tv") ||
      slug.includes("film") ||
      slug.includes("netflix") ||
      slug.includes("hulu") ||
      slug.includes("tubi") ||
      slug.includes("prime") ||
      name.includes("movie")
    ) {
      addCategory("Movies & TV");
    }

    if (
      slug.includes("stock") ||
      slug.includes("vector") ||
      slug.includes("design") ||
      slug.includes("creative") ||
      slug.includes("asset")
    ) {
      addCategory("Creative Assets");
    }

    if (slug.includes("image") || slug.includes("photo") || slug.includes("thumbnail")) {
      addCategory("Image Hosting");
    }

    if (
      slug.includes("facebook") ||
      slug.includes("instagram") ||
      slug.includes("tiktok") ||
      slug.includes("twitter") ||
      slug.includes("youtube") ||
      slug.includes("snapchat") ||
      slug.includes("telegram") ||
      slug.includes("patreon") ||
      slug.includes("onlyfans") ||
      slug.includes("social")
    ) {
      addCategory("Social Media");
    }

    if (
      slug.includes("adult") ||
      slug.includes("porn") ||
      slug.includes("cam") ||
      slug.includes("xxx") ||
      slug.includes("nsfw")
    ) {
      addCategory("Adult");
    }

    if (
      slug.includes("course") ||
      slug.includes("learn") ||
      slug.includes("academy") ||
      slug.includes("class")
    ) {
      addCategory("Course Platforms");
    }

    if (slug.includes("downloader") || name.includes("downloader")) {
      addCategory("Downloader");
    }

    if (derived.size === 0) {
      addCategory("Downloader");
    }
  }

  const seen = new Set<string>();
  const primary: string[] = [];
  const additional: string[] = [];

  derived.forEach((category) => {
    const canonical = canonicalizeCategoryLabel(category);
    const lower = canonical.toLowerCase();
    if (seen.has(lower)) return;
    seen.add(lower);
    if (PRIMARY_CATEGORY_ORDER.has(lower)) {
      primary.push(canonical);
    } else {
      additional.push(canonical);
    }
  });

  primary.sort((a, b) => {
    const aIndex = PRIMARY_CATEGORY_ORDER.get(a.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = PRIMARY_CATEGORY_ORDER.get(b.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });

  return [...primary, ...additional];
}

export function buildCategoryIndex(products: ProductData[]) {
  const index = new Map<string, { label: string; slug: string; count: number }>();

  products.forEach((product) => {
    deriveProductCategories(product).forEach((label) => {
      const slug = slugifyCategoryLabel(label);
      const key = slug.toLowerCase();
      const existing = index.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        index.set(key, { label, slug, count: 1 });
      }
    });
  });

  return index;
}

export function getCategoryLabelFromSlug(
  products: ProductData[],
  slug: string,
): string | undefined {
  const normalizedSlug = slug.toLowerCase();
  const index = buildCategoryIndex(products);
  const direct = index.get(normalizedSlug)?.label;
  if (direct) {
    return direct;
  }

  const aliasLabel = CATEGORY_SLUG_ALIASES.get(normalizedSlug);
  if (!aliasLabel) {
    return undefined;
  }

  const canonicalSlug = slugifyCategoryLabel(aliasLabel).toLowerCase();
  return index.get(canonicalSlug)?.label ?? aliasLabel;
}
