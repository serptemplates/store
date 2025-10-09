"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Search, ChevronDown, X, Check } from "lucide-react";

export type ProductCategory = {
  id: string;
  name: string;
  count: number;
};

export type CategorySelection =
  | { mode: "all"; excluded: string[] }
  | { mode: "custom"; included: string[] };

export type ProductSearchBarProps = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  categories: ProductCategory[];
  categorySelection: CategorySelection;
  setCategorySelection: Dispatch<SetStateAction<CategorySelection>>;
  showPreRelease?: boolean;
  setShowPreRelease?: (value: boolean) => void;
  showNewReleases?: boolean;
  setShowNewReleases?: (value: boolean) => void;
};

function normalizeCategoryId(categoryId: string) {
  return categoryId.trim().toLowerCase();
}

export function ProductSearchBar({
  searchQuery,
  setSearchQuery,
  categories,
  categorySelection,
  setCategorySelection,
  showPreRelease,
  setShowPreRelease,
  showNewReleases,
  setShowNewReleases,
}: ProductSearchBarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const allCategoryIds = useMemo(
    () => categories.filter((category) => category.id !== "all").map((category) => category.id),
    [categories],
  );

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isAllMode = categorySelection.mode === "all";

  const selectedCategoryLabel = useMemo(() => {
    if (isAllMode) {
      if (categorySelection.excluded.length === 0) {
        return "Select All";
      }

      if (categorySelection.excluded.length <= 2) {
        const names = categories
          .filter((category) => categorySelection.excluded.includes(category.id))
          .map((category) => category.name);
        return `All except ${names.join(", ")}`;
      }

      return `All except ${categorySelection.excluded.length} categories`;
    }

    if (categorySelection.included.length === 0) {
      return "Select categories";
    }

    const entries = categories.filter((category) =>
      categorySelection.included.includes(category.id),
    );

    if (entries.length <= 2) {
      return entries.map((entry) => entry.name).join(", ");
    }

    return `${entries.length} categories`;
  }, [categories, categorySelection, isAllMode]);

  const toggleCategory = (rawCategoryId: string) => {
    const categoryId = normalizeCategoryId(rawCategoryId);

    setCategorySelection((current) => {
      if (categoryId === "all") {
        if (current.mode === "all") {
          return { mode: "custom", included: [] };
        }
        return { mode: "all", excluded: [] };
      }

      if (current.mode === "all") {
        const excluded = new Set(current.excluded);
        if (excluded.has(categoryId)) {
          excluded.delete(categoryId);
        } else {
          excluded.add(categoryId);
        }
        return { mode: "all", excluded: Array.from(excluded) };
      }

      const included = new Set(current.included);
      if (included.has(categoryId)) {
        included.delete(categoryId);
      } else {
        included.add(categoryId);
      }
      return { mode: "custom", included: Array.from(included) };
    });
  };

  const hasActiveCategoryFilters =
    (isAllMode && categorySelection.excluded.length > 0) ||
    (!isAllMode && categorySelection.included.length > 0);

  const isCategorySelected = (categoryId: string) => {
    if (categoryId === "all") {
      return isAllMode && categorySelection.excluded.length === 0;
    }

    if (isAllMode) {
      return !categorySelection.excluded.includes(categoryId);
    }

    return categorySelection.included.includes(categoryId);
  };

  const showClearButton = searchQuery.trim().length > 0 || hasActiveCategoryFilters;

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
            <span className={!hasActiveCategoryFilters ? "text-muted-foreground" : undefined}>
              {selectedCategoryLabel}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute z-20 mt-2 w-full max-h-64 overflow-auto rounded-lg border border-border bg-background shadow-lg">
              {categories.map((category) => {
                const selected = isCategorySelected(category.id);

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className={`flex w-full items-center justify-between px-4 py-2 text-sm transition hover:bg-muted/60 ${
                      selected ? "bg-primary/10 text-primary" : ""
                    }`}
                    aria-pressed={selected}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-sm border ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40"
                        }`}
                      >
                        {selected && <Check className="h-3 w-3" />}
                      </span>
                      {category.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{category.count}</span>
                  </button>
                );
              })}
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

        <button
          type="button"
          disabled={!showClearButton}
          onClick={() => {
            if (!showClearButton) return;
            setSearchQuery("");
            setCategorySelection({ mode: "all", excluded: [] });
          }}
          className={`inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-4 text-sm font-medium text-red-600 transition hover:bg-red-500/20 dark:text-red-400 ${
            showClearButton ? "" : "pointer-events-none select-none opacity-0 invisible"
          }`}
          aria-hidden={!showClearButton}
        >
          <X className="h-4 w-4" />
          Clear filters
        </button>
      </div>

      {(searchQuery.trim() || hasActiveCategoryFilters) && (
        <p className="mt-3 text-sm text-muted-foreground">
          Showing results for
          {searchQuery.trim() && (
            <span className="mx-1 font-semibold text-foreground">“{searchQuery.trim()}”</span>
          )}
          {hasActiveCategoryFilters && (
            <span className="ml-1 font-semibold text-foreground">in {selectedCategoryLabel}</span>
          )}
        </p>
      )}
    </div>
  );
}

export default ProductSearchBar;
