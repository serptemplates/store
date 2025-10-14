"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { PRIMARY_CATEGORIES } from "@/lib/products/category-constants";
import {
  ProductSearchBar,
  type ProductCategory,
  type CategorySelection,
} from "./ProductSearchBar";
import { isPreRelease, type ReleaseStatus } from "@/lib/products/release-status";

export type ProductListItem = {
  slug: string;
  name: string;
  categories: string[];
  keywords: string[];
  platform?: string;
  status: ReleaseStatus;
  new_release?: boolean;
  popular?: boolean;
};

const PRIMARY_CATEGORY_ENTRIES = PRIMARY_CATEGORIES.map((name) => ({
  id: name.toLowerCase(),
  name,
}));

const PRIMARY_CATEGORY_ORDER = new Map(
  PRIMARY_CATEGORY_ENTRIES.map((entry, index) => [entry.id, index] as const),
);

const BASE_BADGE_CLASSES =
  "w-fit rounded-full px-3 py-1 text-xs font-medium transition-colors";

type BadgePalette = {
  background: string;
  text: string;
  hoverBackground?: string;
  hoverText?: string;
};

const CATEGORY_BADGE_PALETTE: Record<string, BadgePalette> = {
  downloader: {
    background: "bg-[#e5f4ff]",
    text: "text-[#0d4d8f]",
    hoverBackground: "group-hover:bg-[#d5ecff]",
    hoverText: "group-hover:text-[#0a3c70]",
  },
  "artificial intelligence": {
    background: "bg-[#ede7ff]",
    text: "text-[#5530c1]",
    hoverBackground: "group-hover:bg-[#ded2ff]",
    hoverText: "group-hover:text-[#44249f]",
  },
  adult: {
    background: "bg-[#ffe8ed]",
    text: "text-[#9b1c31]",
    hoverBackground: "group-hover:bg-[#ffd3dc]",
    hoverText: "group-hover:text-[#851326]",
  },
  "course platforms": {
    background: "bg-[#f1f5f9]",
    text: "text-[#1e293b]",
    hoverBackground: "group-hover:bg-[#e2e8f0]",
    hoverText: "group-hover:text-[#111827]",
  },
  livestream: {
    background: "bg-[#fff1d6]",
    text: "text-[#a15c00]",
    hoverBackground: "group-hover:bg-[#ffe3ad]",
    hoverText: "group-hover:text-[#7b4600]",
  },
  "creative assets": {
    background: "bg-[#fbe7ff]",
    text: "text-[#7d2a8f]",
    hoverBackground: "group-hover:bg-[#f4d2ff]",
    hoverText: "group-hover:text-[#662175]",
  },
  "image hosting": {
    background: "bg-[#e5fbf2]",
    text: "text-[#0f766e]",
    hoverBackground: "group-hover:bg-[#ccf4e3]",
    hoverText: "group-hover:text-[#0b5c56]",
  },
  "movies & tv": {
    background: "bg-[#e9edff]",
    text: "text-[#3546d3]",
    hoverBackground: "group-hover:bg-[#d4dbff]",
    hoverText: "group-hover:text-[#2b3bb1]",
  },
  "social media": {
    background: "bg-[#dbe8ff]",
    text: "text-[#1a46ad]",
    hoverBackground: "group-hover:bg-[#c5d8ff]",
    hoverText: "group-hover:text-[#15398d]",
  },
};

const DEFAULT_BADGE_PALETTE: BadgePalette = {
  background: "bg-[#f6f8fa]",
  text: "text-[#2f363d]",
  hoverBackground: "group-hover:bg-[#eaeef2]",
  hoverText: "group-hover:text-[#1f2328]",
};

function getBadgePalette(category?: string): BadgePalette {
  return CATEGORY_BADGE_PALETTE[category?.toLowerCase() ?? ""] ?? DEFAULT_BADGE_PALETTE;
}

function getCategoryBadgeClasses(category?: string) {
  const palette = getBadgePalette(category);
  return [
    BASE_BADGE_CLASSES,
    palette.background,
    palette.text,
    palette.hoverBackground ?? "",
    palette.hoverText ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

function createInitialSelection(initial?: string[]): CategorySelection {
  if (!initial || initial.length === 0) {
    return { mode: "all", excluded: [] };
  }

  const normalized = Array.from(
    new Set(
      initial
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0),
    ),
  );

  if (normalized.length === 0) {
    return { mode: "all", excluded: [] };
  }

  if (normalized.length === 1 && normalized[0] === "all") {
    return { mode: "all", excluded: [] };
  }

  if (normalized.includes("all")) {
    return {
      mode: "custom",
      included: normalized.filter((value) => value !== "all"),
    };
  }

  return { mode: "custom", included: normalized };
}

export type FilterOptions = {
  searchQuery: string;
  categorySelection: CategorySelection;
  showPreRelease: boolean;
  showNewReleases: boolean;
};

export function filterProducts(
  products: ProductListItem[],
  { searchQuery, categorySelection, showPreRelease, showNewReleases }: FilterOptions,
): ProductListItem[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const excludedCategorySet =
    categorySelection.mode === "all"
      ? new Set(categorySelection.excluded.map((category) => category.toLowerCase()))
      : null;

  const includedCategorySet =
    categorySelection.mode === "custom"
      ? new Set(categorySelection.included.map((category) => category.toLowerCase()))
      : null;

  const filteredProducts = products.filter((product) => {
    const productIsPreRelease = isPreRelease(product.status);

    if (!showPreRelease && productIsPreRelease) {
      return false;
    }

    if (!showNewReleases && product.new_release) {
      return false;
    }

    if (
      excludedCategorySet &&
      product.categories.some((category) => excludedCategorySet.has(category.toLowerCase()))
    ) {
      return false;
    }

    if (includedCategorySet) {
      if (includedCategorySet.size === 0) {
        return false;
      }

      const matchesIncluded = product.categories.some((category) =>
        includedCategorySet.has(category.toLowerCase()),
      );

      if (!matchesIncluded) {
        return false;
      }
    }

    if (!normalizedQuery) {
      return true;
    }

    return (
      product.name.toLowerCase().includes(normalizedQuery) ||
      (product.platform?.toLowerCase().includes(normalizedQuery) ?? false) ||
      product.keywords.some((keyword) => keyword.toLowerCase().includes(normalizedQuery))
    );
  });

  return filteredProducts.sort((a, b) => {
    if (a.new_release !== b.new_release) {
      return a.new_release ? -1 : 1;
    }

    if (a.popular !== b.popular) {
      return a.popular ? -1 : 1;
    }

    const aPreRelease = isPreRelease(a.status);
    const bPreRelease = isPreRelease(b.status);
    if (aPreRelease !== bPreRelease) {
      return aPreRelease ? 1 : -1;
    }

    return a.name.localeCompare(b.name);
  });
}

export function ProductsFilter({
  products,
  initialSelectedCategories,
}: {
  products: ProductListItem[];
  initialSelectedCategories?: string[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categorySelection, setCategorySelection] = useState<CategorySelection>(() =>
    createInitialSelection(initialSelectedCategories),
  );
  const [showPreRelease, setShowPreRelease] = useState(true);
  const [showNewReleases, setShowNewReleases] = useState(true);

  const categories: ProductCategory[] = useMemo(() => {
    const counts = new Map<string, ProductCategory>();
    counts.set("all", { id: "all", name: "Select All", count: products.length });

    PRIMARY_CATEGORY_ENTRIES.forEach((entry) => {
      counts.set(entry.id, { ...entry, count: 0 });
    });

    products.forEach((product) => {
      product.categories.forEach((category) => {
        const id = category.toLowerCase();
        const canonical = PRIMARY_CATEGORY_ORDER.has(id)
          ? PRIMARY_CATEGORY_ENTRIES[PRIMARY_CATEGORY_ORDER.get(id)!].name
          : category;

        const entry = counts.get(id) ?? { id, name: canonical, count: 0 };
        entry.name = canonical;
        entry.count += 1;
        counts.set(id, entry);
      });
    });

    const allEntry = counts.get("all");

    const primary = PRIMARY_CATEGORY_ENTRIES.map(({ id }) => counts.get(id))
      .filter((entry): entry is ProductCategory => Boolean(entry && entry.count > 0))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const additional = Array.from(counts.values())
      .filter(
        (entry) =>
          entry.id !== "all" && !PRIMARY_CATEGORY_ORDER.has(entry.id) && entry.count > 0,
      )
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    return [
      ...(allEntry ? [allEntry] : []),
      ...primary,
      ...additional,
    ];
  }, [products]);

  const filtered = useMemo(
    () =>
      filterProducts(products, {
        searchQuery,
        categorySelection,
        showPreRelease,
        showNewReleases,
      }),
    [products, categorySelection, searchQuery, showPreRelease, showNewReleases],
  );

  return (
    <div className="space-y-10">
      <ProductSearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        categories={categories}
        categorySelection={categorySelection}
        setCategorySelection={setCategorySelection}
        showPreRelease={showPreRelease}
        setShowPreRelease={setShowPreRelease}
        showNewReleases={showNewReleases}
        setShowNewReleases={setShowNewReleases}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((product) => {
          const primaryCategory = product.categories[0];
          const badgeClasses = getCategoryBadgeClasses(primaryCategory);
          const isProductPreRelease = isPreRelease(product.status);
          const showNewReleaseBadge = product.new_release && !isProductPreRelease;
          const showPopularBadge = product.popular && !isProductPreRelease && !showNewReleaseBadge;

          return (
            <Link
              key={product.slug}
              href={`/${product.slug}`}
              className={`group relative flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm ring-1 ring-border/60 transition duration-200 hover:-translate-y-1 hover:border-border hover:shadow-lg hover:ring-border ${
                isProductPreRelease || showNewReleaseBadge || showPopularBadge ? "overflow-hidden" : ""
              }`}
            >
              {isProductPreRelease && (
                <div className="absolute -right-12 top-6 rotate-45 bg-gradient-to-r from-purple-500 to-purple-600 px-12 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-md">
                  Pre Release
                </div>
              )}
              {showNewReleaseBadge && (
                <div className="absolute -right-12 top-6 rotate-45 bg-gradient-to-r from-emerald-500 to-teal-600 px-12 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-md">
                  New Release
                </div>
              )}
              {showPopularBadge && (
                <div className="absolute -right-12 top-6 rotate-45 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 px-12 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-md">
                  Most Popular
                </div>
              )}
              <span className={badgeClasses}>{primaryCategory ?? "App"}</span>
              <h3 className="text-sm font-semibold text-foreground">{product.name}</h3>
              <span className="mt-auto text-sm font-medium text-primary transition group-hover:underline">
                {isProductPreRelease ? "Learn More →" : "View →"}
              </span>
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-10 text-center text-sm text-muted-foreground">
            No products match your search yet. Try a different keyword or category.
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductsFilter;
