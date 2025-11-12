import type { Metadata } from "next";
import Link from "next/link";

import PrimaryNavbar from "@/components/navigation/PrimaryNavbar";
import { ProductBreadcrumb } from "@/components/product/ProductBreadcrumb";
import { buildPrimaryNavProps } from "@/lib/navigation";
import { buildCategoryIndex } from "@/lib/products/categories";
import { getAllProducts } from "@/lib/products/product";
import { getSiteConfig } from "@/lib/site-config";
import { getSiteBaseUrl } from "@/lib/urls";

const CATEGORY_BLURB = "Browse every category we support and jump directly into the downloaders that match your workflow.";

function getCategoryEntries() {
  const products = getAllProducts();
  const index = buildCategoryIndex(products);
  const categories = Array.from(index.values()).sort((a, b) => {
    if (a.count !== b.count) {
      return b.count - a.count;
    }
    return a.label.localeCompare(b.label);
  });

  return { products, categories };
}

export default function CategoriesIndexPage() {
  const { products, categories } = getCategoryEntries();
  const siteConfig = getSiteConfig();
  const navProps = buildPrimaryNavProps({ products, siteConfig });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PrimaryNavbar {...navProps} />

      <main className="container flex flex-col gap-12 py-16">
        <ProductBreadcrumb
          className="text-xs text-muted-foreground"
          items={[
            { label: "Home", href: "/" },
            { label: "Categories" },
          ]}
        />

        <section className="space-y-4 text-center md:text-left">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Product Categories</h1>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground md:mx-0">
            {CATEGORY_BLURB}
          </p>
          <p className="text-sm text-muted-foreground">
            {categories.length}{" "}
            {categories.length === 1 ? "category is" : "categories are"} currently available.
          </p>
        </section>

        <section>
          {categories.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/categories/${category.slug}`}
                  className="group flex flex-col rounded-lg border border-border/60 bg-card px-5 py-6 transition hover:border-primary hover:shadow-md"
                >
                  <span className="text-lg font-semibold">{category.label}</span>
                  <span className="mt-2 text-sm text-muted-foreground transition group-hover:text-foreground/80">
                    {category.count} {category.count === 1 ? "product" : "products"}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground md:text-left">
              We&apos;re cataloging categories now. Check back soon for a full index.
            </p>
          )}
        </section>
      </main>

    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = getSiteBaseUrl();

  const title = "Product Categories | SERP Apps";
  const description =
    "Explore SERP Apps categories to discover the right downloader or automation tool for your specific platform or workflow.";

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/categories`,
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: `${baseUrl}/categories`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
