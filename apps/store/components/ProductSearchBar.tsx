"use client";

import { useEffect, useRef, useState } from "react";
import { Search, ChevronDown, X } from "lucide-react";

export type ProductCategory = {
  id: string;
  name: string;
  count: number;
};

export type ProductSearchBarProps = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  categories: ProductCategory[];
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  showPreRelease?: boolean;
  setShowPreRelease?: (value: boolean) => void;
  showNewReleases?: boolean;
  setShowNewReleases?: (value: boolean) => void;
};

export function ProductSearchBar({
  searchQuery,
  setSearchQuery,
  categories,
  selectedCategory,
  setSelectedCategory,
  showPreRelease,
  setShowPreRelease,
  showNewReleases,
  setShowNewReleases,
}: ProductSearchBarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedCategoryLabel =
    categories.find((category) => category.id === selectedCategory)?.name ?? "All Apps";

  return (
    <div className="mb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search downloaders, platforms, or keywords"
            className="h-12 w-full rounded-lg border border-border bg-card/60 pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div ref={dropdownRef} className="relative w-full lg:w-64">
          <button
            type="button"
            onClick={() => setDropdownOpen((open) => !open)}
            className="flex h-12 w-full items-center justify-between rounded-lg border border-border bg-card/60 px-4 text-sm font-medium text-foreground transition hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
          >
            <span className={selectedCategory === "all" ? "text-muted-foreground" : undefined}>
              {selectedCategoryLabel}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute z-20 mt-2 w-full max-h-64 overflow-auto rounded-lg border border-border bg-background shadow-lg">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setDropdownOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2 text-sm transition hover:bg-muted/60 ${
                    selectedCategory === category.id ? "bg-primary/10 text-primary" : ""
                  }`}
                >
                  <span>{category.name}</span>
                  <span className="text-xs text-muted-foreground">{category.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {setShowNewReleases && (
          <button
            type="button"
            onClick={() => setShowNewReleases(!showNewReleases)}
            className={`inline-flex h-12 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition ${
              showNewReleases
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
                : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className={`h-4 w-4 rounded-full border-2 ${
              showNewReleases
                ? "border-emerald-500 bg-emerald-500"
                : "border-muted-foreground"
            }`}>
              {showNewReleases && (
                <svg className="h-full w-full text-white" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M13.485 3.515a.5.5 0 0 1 0 .707l-7 7a.5.5 0 0 1-.707 0l-3-3a.5.5 0 1 1 .707-.707L6 10.03l6.778-6.778a.5.5 0 0 1 .707 0z"/>
                </svg>
              )}
            </div>
            New Releases
          </button>
        )}

        {setShowPreRelease && (
          <button
            type="button"
            onClick={() => setShowPreRelease(!showPreRelease)}
            className={`inline-flex h-12 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition ${
              showPreRelease
                ? "border-purple-500/30 bg-purple-500/10 text-purple-700 hover:bg-purple-500/20 dark:text-purple-400"
                : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className={`h-4 w-4 rounded-full border-2 ${
              showPreRelease
                ? "border-purple-500 bg-purple-500"
                : "border-muted-foreground"
            }`}>
              {showPreRelease && (
                <svg className="h-full w-full text-white" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M13.485 3.515a.5.5 0 0 1 0 .707l-7 7a.5.5 0 0 1-.707 0l-3-3a.5.5 0 1 1 .707-.707L6 10.03l6.778-6.778a.5.5 0 0 1 .707 0z"/>
                </svg>
              )}
            </div>
            Pre Release
          </button>
        )}

        {(searchQuery.trim() || selectedCategory !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
            }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-4 text-sm font-medium text-red-600 transition hover:bg-red-500/20 dark:text-red-400"
          >
            <X className="h-4 w-4" />
            Clear filters
          </button>
        )}
      </div>

      {(searchQuery.trim() || selectedCategory !== "all") && (
        <p className="mt-3 text-sm text-muted-foreground">
          Showing results for
          {searchQuery.trim() && (
            <span className="mx-1 font-semibold text-foreground">“{searchQuery.trim()}”</span>
          )}
          {selectedCategory !== "all" && (
            <span className="ml-1 font-semibold text-foreground">in {selectedCategoryLabel}</span>
          )}
        </p>
      )}
    </div>
  );
}

export default ProductSearchBar;
