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
};

export function ProductsFilter({ products }: { products: ProductListItem[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

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

    return products.filter((product) => {
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
  }, [products, searchQuery, selectedCategory]);

  return (
    <div className="space-y-10">
      <ProductSearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((product) => (
          <Link
            key={product.slug}
            href={`/${product.slug}`}
            className="group flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm ring-1 ring-border/60 transition duration-200 hover:-translate-y-1 hover:border-border hover:shadow-lg hover:ring-border"
          >
            <span className="w-fit rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition group-hover:bg-primary/10 group-hover:text-foreground">
              {product.categories[0] ?? "Downloader"}
            </span>
            <h3 className="text-sm font-semibold text-foreground">{product.name}</h3>
            <span className="mt-auto text-sm font-medium text-primary transition group-hover:underline">
              View →
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
