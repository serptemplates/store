import dynamic from "next/dynamic"
import NextLink from "next/link"
import Script from "next/script"

import { CATEGORY_RULES, PRIMARY_CATEGORIES } from "@/lib/category-constants"
import { getAllProducts } from "@/lib/product"
import { getSiteConfig } from "@/lib/site-config"
import PrimaryNavbar from "@/components/navigation/PrimaryNavbar"
import { buildPrimaryNavProps } from "@/lib/navigation"
import type { ProductData } from "@/lib/product-schema"
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
      addCategory("Live Stream")
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

const heroDescription =
  "Browse the full SERP Apps catalog of downloaders, automations, and growth tools."

export function HomePageView() {
  const products = getAllProducts()
  const siteConfig = getSiteConfig()
  const navProps = buildPrimaryNavProps({ products, siteConfig, showCta: false })

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SERP Apps",
    url: "https://serp.app",
    logo: "https://serp.app/logo.png",
    description: "Browse the full SERP Apps catalog of downloaders, automations, and growth tools.",
    sameAs: ["https://github.com/serpapps", "https://twitter.com/serpapps"],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "support@serp.app",
      url: "https://serp.app/support",
    },
  }

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SERP Apps",
    url: "https://serp.app",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://serp.app/search?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  }

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "SERP Apps Product Catalog",
    description: "Browse all available download automation tools and growth apps",
    url: "https://serp.app",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.slice(0, 10).map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name: product.name,
          url: `https://serp.app/${product.slug}`,
          description: product.description || product.tagline,
        },
      })),
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

    return {
      slug: product.slug,
      name: product.name,
      categories: broadCategories,
      keywords,
      platform: product.platform,
      pre_release: product.pre_release ?? false,
      new_release: product.new_release ?? false,
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

        <footer className="border-t bg-muted/40">
          <div className="container flex flex-col gap-2 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; {new Date().getFullYear()} SERP Apps </p>
            <div className="flex gap-4">
              <NextLink href="/blog" target="_blank" rel="noopener noreferrer" className="underline">
                Blog
              </NextLink>
              <NextLink href="https://github.com/serpapps/legal/blob/main/terms-conditions.md" target="_blank" rel="noopener noreferrer" className="underline">
                Terms & Conditions
              </NextLink>
              <NextLink href="https://github.com/serpapps/legal/blob/main/refund-policy.md" target="_blank" rel="noopener noreferrer" className="underline">
                Refund Policy
              </NextLink>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}

export default HomePageView
