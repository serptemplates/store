import dynamic from "next/dynamic"
import Script from "next/script"

import { getAllProducts } from "@/lib/products/product"
import { getSiteConfig } from "@/lib/site-config"
import PrimaryNavbar from "@/components/navigation/PrimaryNavbar"
import { buildPrimaryNavProps } from "@/lib/navigation"
import { Footer as FooterComposite } from "@repo/ui/composites/Footer"
import { createSchemaProduct, generateProductSchemaLD } from "@/schema"
import { isPreRelease } from "@/lib/products/release-status"
import { buildProductFilterItems } from "@/lib/products/filter-items"

import { WhoIsBehind } from "./WhoIsBehind"

const ProductsFilter = dynamic(
  () => import("@/components/ProductsFilter").then((mod) => ({ default: mod.ProductsFilter })),
  {
    ssr: true,
    loading: () => <div className="min-h-[400px] animate-pulse bg-muted/20 rounded-lg" />,
  },
)

const STORE_ORIGIN = "https://apps.serp.co"

const heroDescription = "Browse the full catalog of SERP products."

export function HomePageView() {
  const products = getAllProducts()
  const siteConfig = getSiteConfig()
  const navProps = buildPrimaryNavProps({ products, siteConfig })

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SERP Apps",
    url: "https://apps.serp.co",
    logo: "https://apps.serp.co/logo.svg",
    description: "Browse the full catalog of SERP products.",
    sameAs: ["https://github.com/serpapps", "https://twitter.com/serpapps"],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "support@apps.serp.co",
      url: "https://apps.serp.co/support",
    },
  }

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SERP Apps",
    url: "https://apps.serp.co",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://apps.serp.co/search?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  }

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "SERP Apps Product Catalog",
    description: "Browse all available download automation tools and growth apps",
    url: STORE_ORIGIN,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.map((product, index) => {
        const productUrl = `${STORE_ORIGIN}/${product.slug}`
        const currency = product.pricing?.currency?.trim().toUpperCase() || "USD"
        const schemaProduct = createSchemaProduct(product, {
          price: product.pricing?.price ?? null,
          isDigital: true,
        })

        const productSchema = generateProductSchemaLD({
          product: schemaProduct,
          url: productUrl,
          storeUrl: STORE_ORIGIN,
          storeName: "SERP Apps",
          brandName: product.brand?.trim() || "SERP Apps",
          currency,
          preRelease: isPreRelease(product),
        })

        const {
          name,
          description,
          sku,
          brand,
          image,
          offers,
          aggregateRating,
          review,
        } = productSchema

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
        }
      }),
    },
  }

  const filterItems = buildProductFilterItems(products)

  return (
    <>
      <Script
        id="organization-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <Script
        id="website-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema),
        }}
      />
      <Script
        id="collection-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionSchema),
        }}
      />

      <div className="flex min-h-screen flex-col bg-background">
        <PrimaryNavbar {...navProps} />

        <main className="container flex flex-col gap-16 py-16">
          <section className="relative z-0 text-center space-y-6">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">SERP Apps</h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{heroDescription}</p>
          </section>

          <ProductsFilter products={filterItems} />
        </main>

        <FooterComposite site={{ name: "SERP", url: "https://serp.co" }} />
      </div>
    </>
  )
}

export default HomePageView
