import dynamic from "next/dynamic"
import Script from "next/script"

import { CATEGORY_RULES, PRIMARY_CATEGORIES } from "@/lib/products/category-constants"
import { getAllProducts } from "@/lib/products/product"
import { getSiteConfig } from "@/lib/site-config"
import PrimaryNavbar from "@/components/navigation/PrimaryNavbar"
import { buildPrimaryNavProps } from "@/lib/navigation"
import type { ProductData } from "@/lib/products/product-schema"
import { Footer as FooterComposite } from "@repo/ui/composites/Footer"
import { shouldShowNewReleaseBanner } from "@/lib/products/badge-config"
import { createSchemaProduct, generateProductSchemaLD } from "@/schema"

import { WhoIsBehind } from "./WhoIsBehind"

const ProductsFilter = dynamic(
  () => import("@/components/ProductsFilter").then((mod) => ({ default: mod.ProductsFilter })),
  {
    ssr: true,
    loading: () => <div className="min-h-[400px] animate-pulse bg-muted/20 rounded-lg" />,
  },
)

const CATEGORY_ORDER = new Map(
  PRIMARY_CATEGORIES.map((label, index) => [label.toLowerCase(), index] as const),
)

const CATEGORY_CANONICAL_LABELS = new Map(
  PRIMARY_CATEGORIES.map((label) => [label.toLowerCase(), label] as const),
)

const STORE_ORIGIN = "https://apps.serp.co"

function deriveCategories(product: ProductData): string[] {
  if (product.categories && product.categories.length > 0) {
    const validCategories = product.categories.filter(
      (cat) =>
        cat.toLowerCase() !== product.name?.toLowerCase() &&
        cat.toLowerCase() !== product.platform?.toLowerCase(),
    )

    if (validCategories.length > 0) {
      const seen = new Set<string>()
      const recognized: string[] = []
      const additional: string[] = []

      validCategories.forEach((category) => {
        const lower = category.toLowerCase()
        if (seen.has(lower)) return
        seen.add(lower)

        const canonical = CATEGORY_CANONICAL_LABELS.get(lower) ?? category
        if (CATEGORY_ORDER.has(lower)) {
          recognized.push(canonical)
        } else {
          additional.push(canonical)
        }
      })

      recognized.sort((a, b) => {
        const aIndex = CATEGORY_ORDER.get(a.toLowerCase()) ?? Number.MAX_SAFE_INTEGER
        const bIndex = CATEGORY_ORDER.get(b.toLowerCase()) ?? Number.MAX_SAFE_INTEGER
        return aIndex - bIndex
      })

      return [...recognized, ...additional]
    }
  }

  const haystack = [product.slug, product.platform, ...(product.keywords ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  const categories = new Set<string>()

  CATEGORY_RULES.forEach((rule) => {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      categories.add(rule.label)
    }
  })

  if (categories.size === 0) {
    const slug = product.slug?.toLowerCase() || ""
    const name = product.name?.toLowerCase() || ""

    const addCategory = (label: string) => {
      const canonical = CATEGORY_CANONICAL_LABELS.get(label.toLowerCase()) ?? label
      categories.add(canonical)
    }

    if (slug.includes("ai-") || name.includes("ai ")) {
      addCategory("Artificial Intelligence")
    }

    if (slug.includes("live") || slug.includes("stream") || name.includes("stream")) {
      addCategory("Livestream")
    }

    if (
      slug.includes("movie") ||
      slug.includes("tv") ||
      slug.includes("film") ||
      slug.includes("netflix") ||
      slug.includes("hulu") ||
      slug.includes("tubi") ||
      slug.includes("prime") ||
      name.includes("movie")
    ) {
      addCategory("Movies & TV")
    }

    if (
      slug.includes("stock") ||
      slug.includes("vector") ||
      slug.includes("design") ||
      slug.includes("creative") ||
      slug.includes("asset")
    ) {
      addCategory("Creative Assets")
    }

    if (slug.includes("image") || slug.includes("photo") || slug.includes("thumbnail")) {
      addCategory("Image Hosting")
    }

    if (
      slug.includes("facebook") ||
      slug.includes("instagram") ||
      slug.includes("tiktok") ||
      slug.includes("twitter") ||
      slug.includes("youtube") ||
      slug.includes("snapchat") ||
      slug.includes("telegram") ||
      slug.includes("patreon") ||
      slug.includes("onlyfans") ||
      slug.includes("social")
    ) {
      addCategory("Social Media")
    }

    if (
      slug.includes("adult") ||
      slug.includes("porn") ||
      slug.includes("cam") ||
      slug.includes("xxx") ||
      slug.includes("nsfw")
    ) {
      addCategory("Adult")
    }

    if (
      slug.includes("course") ||
      slug.includes("learn") ||
      slug.includes("academy") ||
      slug.includes("class")
    ) {
      addCategory("Course Platforms")
    }

    if (slug.includes("downloader") || name.includes("downloader")) {
      addCategory("Downloader")
    }

    if (categories.size === 0) {
      addCategory("Downloader")
    }
  }

  const recognized: string[] = []
  const additional: string[] = []
  const seen = new Set<string>()

  Array.from(categories).forEach((category) => {
    const lower = category.toLowerCase()
    if (seen.has(lower)) return
    seen.add(lower)

    if (CATEGORY_ORDER.has(lower)) {
      recognized.push(CATEGORY_CANONICAL_LABELS.get(lower) ?? category)
    } else {
      additional.push(category)
    }
  })

  recognized.sort((a, b) => {
    const aIndex = CATEGORY_ORDER.get(a.toLowerCase()) ?? Number.MAX_SAFE_INTEGER
    const bIndex = CATEGORY_ORDER.get(b.toLowerCase()) ?? Number.MAX_SAFE_INTEGER
    return aIndex - bIndex
  })

  return [...recognized, ...additional]
}

const heroDescription = "Browse the full catalog of SERP products."

export function HomePageView() {
  const products = getAllProducts()
  const siteConfig = getSiteConfig()
  const navProps = buildPrimaryNavProps({ products, siteConfig, showCta: false })

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SERP Apps",
    url: "https://apps.serp.co",
    logo: "https://apps.serp.co/logo.png",
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
      itemListElement: products.slice(0, 10).map((product, index) => {
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
          preRelease: product.pre_release ?? false,
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

  const filterItems = products.map((product) => {
    const broadCategories = deriveCategories(product)
    const keywords = Array.from(
      new Set(
        [
          product.name,
          product.platform ?? "",
          ...(product.keywords ?? []),
          ...broadCategories,
        ].filter(Boolean),
      ),
    )

    const displayNewRelease = Boolean(product.new_release && shouldShowNewReleaseBanner(product.slug))

    return {
      slug: product.slug,
      name: product.name,
      categories: broadCategories,
      keywords,
      platform: product.platform,
      pre_release: product.pre_release ?? false,
      new_release: displayNewRelease,
      popular: product.popular ?? false,
    }
  })

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
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">SERP Store</h1>
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
