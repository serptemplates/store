"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { PRIMARY_CATEGORIES } from "@/lib/products/category-constants";

import { ProductSearchBar, type ProductCategory } from "./ProductSearchBar";

export type ProductListItem = {
  slug: string;
  name: string;
  categories: string[];
  keywords: string[];
  platform?: string;
  pre_release?: boolean;
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

export function ProductsFilter({ products }: { products: ProductListItem[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showPreRelease, setShowPreRelease] = useState(true);
  const [showNewReleases, setShowNewReleases] = useState(true);

  const categories: ProductCategory[] = useMemo(() => {
    const counts = new Map<string, ProductCategory>();
    counts.set("all", { id: "all", name: "All Apps", count: products.length });

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
    const orderedPrimary = PRIMARY_CATEGORY_ENTRIES.map(({ id }) => counts.get(id))
      .filter((entry): entry is ProductCategory => Boolean(entry && entry.count > 0));

    const additional = Array.from(counts.values())
      .filter(
        (entry) =>
          entry.id !== "all" && !PRIMARY_CATEGORY_ORDER.has(entry.id) && entry.count > 0,
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    return [
      ...(allEntry ? [allEntry] : []),
      ...orderedPrimary,
      ...additional,
    ];
  }, [products]);

  const filtered = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filteredProducts = products.filter((product) => {
      // Filter out pre-release products if toggle is off
      if (!showPreRelease && product.pre_release) return false;

      // Filter to show only new releases if toggle is on
      if (showNewReleases && !showPreRelease) {
        // If showing new releases but not pre-release, only show new releases and regular products
        // (this keeps new releases visible when coming soon is hidden)
      } else if (!showNewReleases && product.new_release) {
        // If new releases toggle is off, hide new release products
        return false;
      }

      const matchesCategory =
        selectedCategory === "all" ||
        product.categories.some((category) => category.toLowerCase() === selectedCategory);

      if (!matchesCategory) return false;

      if (!normalizedQuery) return true;

      return (
        product.name.toLowerCase().includes(normalizedQuery) ||
        (product.platform?.toLowerCase().includes(normalizedQuery) ?? false) ||
        product.keywords.some((keyword) => keyword.toLowerCase().includes(normalizedQuery))
      );
    });

    // Sort: new releases first, then available products, then pre-release products
    return filteredProducts.sort((a, b) => {
      if (a.new_release !== b.new_release) {
        return a.new_release ? -1 : 1;
      }

      if (a.popular !== b.popular) {
        return a.popular ? -1 : 1;
      }

      if (a.pre_release !== b.pre_release) {
        return a.pre_release ? 1 : -1;
      }

      return a.name.localeCompare(b.name);
    });
  }, [products, searchQuery, selectedCategory, showPreRelease, showNewReleases]);

  return (
    <div className="space-y-10">
      <ProductSearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        showPreRelease={showPreRelease}
        setShowPreRelease={setShowPreRelease}
        showNewReleases={showNewReleases}
        setShowNewReleases={setShowNewReleases}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((product) => (
          <Link
            key={product.slug}
            href={`/${product.slug}`}
            className={`group relative flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm ring-1 ring-border/60 transition duration-200 hover:-translate-y-1 hover:border-border hover:shadow-lg hover:ring-border ${
              product.pre_release || product.new_release || product.popular ? "overflow-hidden" : ""
            }`}
          >
            {product.pre_release && (
              <div className="absolute -right-12 top-6 rotate-45 bg-gradient-to-r from-purple-500 to-purple-600 px-12 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-md">
                Pre Release
              </div>
            )}
            {product.new_release && !product.pre_release && (
              <div className="absolute -right-12 top-6 rotate-45 bg-gradient-to-r from-emerald-500 to-teal-600 px-12 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-md">
                New Release
              </div>
            )}
            {product.popular && !product.pre_release && !product.new_release && (
              <div className="absolute -right-12 top-6 rotate-45 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 px-12 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-md">
                Most Popular
              </div>
            )}
            <span className="w-fit rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition group-hover:bg-primary/10 group-hover:text-foreground">
              {product.categories[0] ?? "App"}
            </span>
            <h3 className="text-sm font-semibold text-foreground">{product.name}</h3>
            <span className="mt-auto text-sm font-medium text-primary transition group-hover:underline">
              {product.pre_release ? "Learn More →" : "View →"}
            </span>
          </Link>
        ))}

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
