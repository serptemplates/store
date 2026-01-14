import type { Metadata } from "next";
import Script from "next/script";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";

import PrimaryNavbar from "@/components/navigation/PrimaryNavbar";
import { ProductBreadcrumb } from "@/components/product/ProductBreadcrumb";
import { buildPrimaryNavProps } from "@/lib/navigation";
import { getAllProducts } from "@/lib/products/product";
import { buildProductFilterItems } from "@/lib/products/filter-items";
import {
  deriveProductCategories,
  getCategoryLabelFromSlug,
  slugifyCategoryLabel,
} from "@/lib/products/categories";
import { isPreRelease } from "@/lib/products/release-status";
import { ROUTES } from "@/lib/routes";
import { getSiteConfig } from "@/lib/site-config";
import { getSiteBaseUrl } from "@/lib/urls";
import { resolveProductPrice } from "@/lib/pricing/price-manifest";
import { createSchemaProduct, generateProductSchemaLD } from "@/schema";

const ProductsFilter = dynamic(
  () => import("@/components/ProductsFilter").then((mod) => ({ default: mod.ProductsFilter })),
  {
    ssr: true,
    loading: () => <div className="min-h-[400px] animate-pulse rounded-lg bg-muted/20" />,
  },
);

export default async function CategoryLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const products = getAllProducts();
  const siteConfig = getSiteConfig();
  const navProps = buildPrimaryNavProps({ products, siteConfig });
  const baseUrl = getSiteBaseUrl();
  const storeName = siteConfig.site?.name ?? "SERP Apps";

  const categoryLabel = getCategoryLabelFromSlug(products, slug);
  if (!categoryLabel) {
    notFound();
  }

  const normalizedSlug = slugifyCategoryLabel(categoryLabel);
  const matchingProducts = products.filter((product) =>
    deriveProductCategories(product).some(
      (category) => slugifyCategoryLabel(category) === normalizedSlug,
    ),
  );

  const filterItems = buildProductFilterItems(matchingProducts);
  const canonicalUrl = `${baseUrl}${ROUTES.category(normalizedSlug)}`;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Categories",
        item: `${baseUrl}${ROUTES.categories}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: categoryLabel,
        item: canonicalUrl,
      },
    ],
  };

  const itemListElement =
    matchingProducts.length > 0
      ? matchingProducts.map((product, index) => {
          const productUrl = `${baseUrl}/${product.slug}`;
          const priceDetails = resolveProductPrice(product);
          const schemaProduct = createSchemaProduct(product, {
            price: priceDetails.amount ?? null,
            isDigital: true,
          });

          const productSchema = generateProductSchemaLD({
            product: schemaProduct,
            url: productUrl,
            storeUrl: baseUrl,
            storeName,
            brandName: product.brand?.trim() || storeName,
            currency: priceDetails.currency,
            preRelease: isPreRelease(product),
          });

          const { name, description, sku, brand, image, offers, aggregateRating, review } =
            productSchema;

          return {
            "@type": "ListItem",
            position: index + 1,
            item: {
              "@type": "Product",
              name,
              description,
              url: productUrl,
              sku,
              ...(brand && { brand }),
              ...(image && { image }),
              offers,
              ...(aggregateRating && { aggregateRating }),
              ...(Array.isArray(review) && review.length > 0 && { review }),
            },
          };
        })
      : [];

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: categoryLabel,
    description: `Explore curated ${categoryLabel.toLowerCase()} tools from ${storeName}.`,
    url: canonicalUrl,
    mainEntity: {
      "@type": "ItemList",
      name: `${categoryLabel} Catalog`,
      numberOfItems: matchingProducts.length,
      itemListElement,
    },
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Script
        id={`category-breadcrumb-${normalizedSlug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Script
        id={`category-collection-${normalizedSlug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <PrimaryNavbar {...navProps} />

      <main className="container flex flex-col gap-12 py-16">
        <ProductBreadcrumb
          className="text-xs text-muted-foreground"
          items={[
            { label: "Home", href: "/" },
            { label: "Categories", href: ROUTES.categories },
            { label: `${categoryLabel}` },
          ]}
        />

        <section className="space-y-4 text-center md:text-left">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {categoryLabel}
          </h1>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground md:mx-0">
            Explore {matchingProducts.length}{" "}
            {matchingProducts.length === 1 ? "tool" : "tools"} in our{" "}
            {categoryLabel.toLowerCase()} catalog designed to streamline your workflows.
          </p>
        </section>

        {filterItems.length > 0 ? (
          <ProductsFilter products={filterItems} initialSelectedCategories={[categoryLabel]} />
        ) : (
          <p className="text-center text-muted-foreground md:text-left">
            We&apos;re curating new tools for this category. Check back soon or browse the full
            catalog from the homepage.
          </p>
        )}
      </main>

    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const products = getAllProducts();
  const categoryLabel = getCategoryLabelFromSlug(products, slug);
  if (!categoryLabel) {
    return {};
  }

  const baseUrl = getSiteBaseUrl();
  const title = `${categoryLabel} | SERP Apps`;
  const description = `Browse vetted ${categoryLabel.toLowerCase()} tools from SERP Apps with seamless workflows.`;
  const canonical = `${baseUrl}${ROUTES.category(slugifyCategoryLabel(categoryLabel))}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export function generateStaticParams() {
  const products = getAllProducts();
  const seen = new Set<string>();

  return products
    .flatMap((product) => deriveProductCategories(product))
    .map((category) => slugifyCategoryLabel(category))
    .filter((slug) => {
      if (!slug) return false;
      if (seen.has(slug)) return false;
      seen.add(slug);
      return true;
    })
    .map((slug) => ({ slug }));
}
