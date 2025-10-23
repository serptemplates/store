import React from "react";
import Link from "next/link";
import type { Route } from "next";

export interface ProductBreadcrumbItem {
  label: string;
  href?: string;
}

export interface ProductBreadcrumbProps {
  items: ProductBreadcrumbItem[];
  className?: string;
}

export function ProductBreadcrumb({ items, className }: ProductBreadcrumbProps) {
  return (
    <nav className={className ?? "text-sm"} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2 text-gray-500">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-2">
            {item.href ? (
              <Link href={item.href as Route} className="hover:text-gray-700">
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-900 font-medium">{item.label}</span>
            )}
            {index < items.length - 1 && <span>/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
