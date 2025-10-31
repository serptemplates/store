'use client';

import Link from "next/link";

import { getCategoryBadgeClasses } from "@/components/category-badge";
import { slugifyCategoryLabel } from "@/lib/products/categories";

type ProductCategoryPillsProps = {
  categories?: string[];
  max?: number;
  className?: string;
};

export function ProductCategoryPills({ categories, max, className }: ProductCategoryPillsProps) {
  if (!Array.isArray(categories) || categories.length === 0) {
    return null;
  }

  const limitedCategories = typeof max === "number" && max > 0 ? categories.slice(0, max) : categories;
  const containerClassName = ["flex flex-wrap gap-2", className].filter(Boolean).join(" ");

  const pills = limitedCategories
    .map((category) => {
      if (typeof category !== "string") {
        return null;
      }
      const originalLabel = category.trim();
      if (!originalLabel) {
        return null;
      }

      const slug = slugifyCategoryLabel(originalLabel);
      if (!slug) {
        return null;
      }

      const displayLabel = originalLabel.replace(/\s+Downloads$/i, "").trim() || originalLabel;

      return (
        <Link key={slug} href={`/categories/${slug}`} className={`group ${getCategoryBadgeClasses(originalLabel)}`}>
          {displayLabel}
        </Link>
      );
    })
    .filter(Boolean);

  if (pills.length === 0) {
    return null;
  }

  return <div className={containerClassName}>{pills}</div>;
}
