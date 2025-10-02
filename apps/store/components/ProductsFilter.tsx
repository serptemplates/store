"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { ProductSearchBar, type ProductCategory } from "./ProductSearchBar";

export type ProductListItem = {
  slug: string;
  name: string;
  categories: string[];
  keywords: string[];
  platform?: string;
  coming_soon?: boolean;
  new_release?: boolean;
  popular?: boolean;
};

export function ProductsFilter({ products }: { products: ProductListItem[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showComingSoon, setShowComingSoon] = useState(true);
  const [showNewReleases, setShowNewReleases] = useState(true);

  const categories: ProductCategory[] = useMemo(() => {
    const counts = new Map<string, { id: string; name: string; count: number }>();
    counts.set("all", { id: "all", name: "All Apps", count: products.length });

    products.forEach((product) => {
      product.categories.forEach((category) => {
        const id = category.toLowerCase();
        const entry = counts.get(id) ?? { id, name: category, count: 0 };
        entry.count += 1;
        counts.set(id, entry);
      });
    });

    return Array.from(counts.values()).sort((a, b) => {
      if (a.id === "all") return -1;
      if (b.id === "all") return 1;
      return b.count - a.count;
    });
  }, [products]);

  const filtered = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filteredProducts = products.filter((product) => {
      // Filter out coming soon products if toggle is off
      if (!showComingSoon && product.coming_soon) return false;

      // Filter to show only new releases if toggle is on
      if (showNewReleases && !showComingSoon) {
        // If showing new releases but not coming soon, only show new releases and regular products
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

    // Sort: new releases first, then available products, then coming soon products
    return filteredProducts.sort((a, b) => {
      if (a.new_release !== b.new_release) {
        return a.new_release ? -1 : 1;
      }

      if (a.popular !== b.popular) {
        return a.popular ? -1 : 1;
      }

      if (a.coming_soon !== b.coming_soon) {
        return a.coming_soon ? 1 : -1;
      }

      return a.name.localeCompare(b.name);
    });
  }, [products, searchQuery, selectedCategory, showComingSoon, showNewReleases]);

  return (
    <div className="space-y-10">
      <ProductSearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        showComingSoon={showComingSoon}
        setShowComingSoon={setShowComingSoon}
        showNewReleases={showNewReleases}
        setShowNewReleases={setShowNewReleases}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((product) => (
          <Link
            key={product.slug}
            href={`/${product.slug}`}
            className={`group relative flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm ring-1 ring-border/60 transition duration-200 hover:-translate-y-1 hover:border-border hover:shadow-lg hover:ring-border ${
              product.coming_soon || product.new_release || product.popular ? "overflow-hidden" : ""
            }`}
          >
            {product.coming_soon && (
              <div className="absolute -right-12 top-6 rotate-45 bg-gradient-to-r from-purple-500 to-purple-600 px-12 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-md">
                Coming Soon
              </div>
            )}
            {product.new_release && !product.coming_soon && (
              <div className="absolute -right-12 top-6 rotate-45 bg-gradient-to-r from-emerald-500 to-teal-600 px-12 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-md">
                New Release
              </div>
            )}
            {product.popular && !product.coming_soon && !product.new_release && (
              <div className="absolute -right-12 top-6 rotate-45 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 px-12 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-md">
                Most Popular
              </div>
            )}
            <span className="w-fit rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition group-hover:bg-primary/10 group-hover:text-foreground">
              {product.categories[0] ?? "App"}
            </span>
            <h3 className="text-sm font-semibold text-foreground">{product.name}</h3>
            <span className="mt-auto text-sm font-medium text-primary transition group-hover:underline">
              {product.coming_soon ? "Learn More →" : "View →"}
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
