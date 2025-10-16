import Script from "next/script"

import type { ProductData } from "@/lib/products/product-schema"
import { isPreRelease } from "@/lib/products/release-status"
import { canonicalizeStoreOrigin, getDefaultStoreUrl } from "@/lib/canonical-url"

import {
  createSchemaProduct,
  generateBreadcrumbSchema,
  generateOrganizationSchema,
  generateProductSchemaLD,
  generateTranslatedResultsSchema,
} from "./product-schema-ld"

const FALLBACK_STORE_URL = getDefaultStoreUrl()
const STORE_NAME = "SERP Apps"

interface StructuredDataProps {
  product: ProductData
  url: string
}

const resolveStoreUrl = (url: string): string => {
  try {
    const origin = new URL(url).origin
    return canonicalizeStoreOrigin(origin)
  } catch {
    return FALLBACK_STORE_URL
  }
}

const buildWebsiteSchema = (storeUrl: string) => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: STORE_NAME,
  url: storeUrl,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${storeUrl}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
})

const parseYoutubeId = (videoUrl: string): string | null => {
  const match = videoUrl.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\\s]{11})/,
  )
  return match?.[1] ?? null
}

const buildVideoSchemas = (product: ProductData, storeUrl: string) => {
  return (product.product_videos ?? [])
    .map((videoUrl, index) => {
      if (!videoUrl || typeof videoUrl !== "string") {
        return null
      }

      const videoId = parseYoutubeId(videoUrl)
      const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : videoUrl
      const thumbnailUrl = videoId
        ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        : product.featured_image ?? undefined

      return {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: `${product.name} - Demo Video ${index + 1}`,
        description:
          product.description?.slice(0, 260) ??
          product.tagline ??
          `Discover ${product.name} in action.`,
        thumbnailUrl: thumbnailUrl ? [thumbnailUrl] : undefined,
        uploadDate: new Date().toISOString(),
        contentUrl: videoUrl,
        embedUrl,
        duration: "PT5M",
        publisher: {
          "@type": "Organization",
          name: STORE_NAME,
          url: storeUrl,
        },
      }
    })
    .filter((schema): schema is Exclude<typeof schema, null> => Boolean(schema))
}

export function ProductStructuredData({ product, url }: StructuredDataProps) {
  const storeUrl = resolveStoreUrl(url)
  const productUrl = url
  const productId = `${productUrl.replace(/#.*$/, "")}#product`
  const currency = product.pricing?.currency?.trim()?.toUpperCase() || "USD"

  const schemaProduct = createSchemaProduct(product, {
    price: product.pricing?.price ?? null,
    isDigital: true,
  })

  const productSlugPath = product.slug
    ? (product.slug.startsWith("/") ? product.slug : `/${product.slug}`)
    : '/'

  const productSchema = generateProductSchemaLD({
    product: schemaProduct,
    url: productUrl,
    storeUrl,
    storeName: STORE_NAME,
    brandName: product.brand?.trim() || STORE_NAME,
    currency,
    preRelease: isPreRelease(product),
    productId,
  })

  const breadcrumbSchema = generateBreadcrumbSchema({
    items: [
      { name: "Home", url: "/" },
      { name: product.name, url: productSlugPath },
    ],
    storeUrl,
  })

  const organizationSchema = generateOrganizationSchema({
    storeName: STORE_NAME,
    storeUrl,
    logoUrl: `${storeUrl}/logo.png`,
    description: "Browse the full catalog of SERP products.",
  })

  const websiteSchema = buildWebsiteSchema(storeUrl)
  const videoSchemas = buildVideoSchemas(product, storeUrl)
  const translatedResultsSchema = generateTranslatedResultsSchema({
    url: productUrl,
    name: product.name,
    productId,
    storeUrl,
    storeName: STORE_NAME,
  })

  return (
    <>
      <Script
        id="product-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productSchema),
        }}
      />

      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />

      {videoSchemas.map((schema, index) => (
        <Script
          key={`video-schema-${index}`}
          id={`video-schema-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema),
          }}
        />
      ))}

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
        id="product-translated-results"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(translatedResultsSchema),
        }}
      />
    </>
  )
}
