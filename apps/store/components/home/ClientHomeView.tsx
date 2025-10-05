/* eslint-disable react-hooks/rules-of-hooks */
"use client"

import { useCallback } from "react"
import Script from "next/script"
import NextLink from "next/link"
import Image from "next/image"

import { HomeTemplate } from "@repo/templates"
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Input } from "@repo/ui"
import { Footer as FooterComposite } from "@repo/ui/composites/Footer"

import { useAffiliateTracking } from "@/components/product/useAffiliateTracking"
import type { BlogPostMeta } from "@/lib/blog"
import { productToHomeTemplate } from "@/lib/product-adapter"
import type { ProductData } from "@/lib/product-schema"
import type { SiteConfig } from "@/lib/site-config"
import { getProductVideoEntries } from "@/lib/video"
import PrimaryNavbar from "@/components/navigation/PrimaryNavbar"
import type { PrimaryNavProps } from "@/lib/navigation"

export type ClientHomeProps = {
  product: ProductData
  posts: BlogPostMeta[]
  siteConfig: SiteConfig
  navProps: PrimaryNavProps
}

export function ClientHomeView({ product, posts, siteConfig, navProps }: ClientHomeProps) {
  const homeProps = productToHomeTemplate(product, posts)
  const productVideos = getProductVideoEntries(product)
  const primaryWatchVideo = productVideos.find((video) => video.source === 'primary') ?? productVideos[0]
  const { affiliateId, checkoutSuccess } = useAffiliateTracking()
  const checkoutHref = `/checkout?product=${product.slug}${affiliateId ? `&aff=${affiliateId}` : ""}`
  const buyButtonDestination = product.buy_button_destination ?? undefined
  const useExternalBuyDestination = Boolean(buyButtonDestination)
  const resolvedPricingHref = buyButtonDestination ?? checkoutHref

  const showPosts = siteConfig.blog?.enabled !== false

  const Navbar = useCallback(() => <PrimaryNavbar {...navProps} />, [navProps])

  const Footer = useCallback(() => <FooterComposite />, [])

  const siteUrl = siteConfig.site?.domain ? `https://${siteConfig.site.domain}` : "https://store.serp.co"
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${siteUrl}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Products",
        item: `${siteUrl}/#products`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: `${siteUrl}/${product.slug}`,
      },
    ],
  }

  return (
    <>
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />

      {checkoutSuccess && (
        <div className="mx-auto mb-6 mt-4 w-full max-w-4xl px-4">
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-green-900 shadow-sm">
            <h2 className="text-lg font-semibold">Thank you! 🎉</h2>
            <p className="mt-2 text-sm text-green-800">
              Your checkout was successful. We just sent a receipt and next steps to your inbox.
              You can close this tab or keep browsing for more tools any time.
            </p>
          </div>
        </div>
      )}

      <HomeTemplate
        ui={{ Navbar, Footer, Button, Card, CardHeader, CardTitle, CardContent, Badge, Input }}
        {...homeProps}
        showPosts={showPosts}
        posts={showPosts ? homeProps.posts : []}
        postsTitle={showPosts ? homeProps.postsTitle : undefined}
        ctaText={siteConfig.cta?.text ?? homeProps.ctaText}
        ctaHref={siteConfig.cta?.href ?? homeProps.ctaHref}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Products", href: "/#products" },
          { label: product.name },
        ]}
        pricing={
          homeProps.pricing
            ? {
                ...homeProps.pricing,
                originalPrice: homeProps.pricing.originalPrice || "$27.99",
                priceNote: "Use the product on a single project",
                onCtaClick: useExternalBuyDestination
                  ? undefined
                  : () => {
                      window.location.href = checkoutHref
                    },
                ctaLoading: false,
                ctaDisabled: false,
                ctaHref: resolvedPricingHref,
                ctaText: "GET IT NOW",
                ctaExtra: null,
              }
            : undefined
        }
      />

      {productVideos.length > 0 && (
        <section className="bg-gray-50 py-12">
          <div className="container mx-auto px-4">
            <div className="mb-8 flex flex-col gap-3 text-center">
              <span className="mx-auto inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-blue-700">
                Product Videos
              </span>
              <h2 className="text-3xl font-semibold text-gray-900">See {product.name} in action</h2>
              <p className="mx-auto max-w-2xl text-sm text-gray-600">
                Watch walkthroughs and related clips without leaving the page. Each video opens in a dedicated watch experience optimized for Google.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {productVideos.map((video) => (
                <article
                  key={video.watchPath}
                  className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <NextLink href={video.watchPath} className="relative block aspect-video overflow-hidden bg-gray-200">
                    {video.thumbnailUrl ? (
                      <Image
                        src={video.thumbnailUrl}
                        alt={video.title}
                        fill
                        className="object-cover"
                        loading="lazy"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                        Video preview unavailable
                      </div>
                    )}
                    <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-blue-700 shadow">
                      Watch now
                    </span>
                  </NextLink>
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-purple-600">
                      <span>{video.source === 'primary' ? 'Demo' : 'Related'}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      <NextLink href={video.watchPath} className="hover:text-blue-600">
                        {video.title}
                      </NextLink>
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-3">{video.description}</p>
                    <div className="mt-auto flex items-center justify-between pt-2 text-sm">
                      <span className="text-gray-500">{video.platform.toUpperCase()}</span>
                      <NextLink href={video.watchPath} className="text-blue-600 hover:text-blue-700">
                        View →
                      </NextLink>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {primaryWatchVideo && (
              <div className="mt-10 flex justify-center">
                <NextLink
                  href={primaryWatchVideo.watchPath}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  Open dedicated watch page
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="M12 5l7 7-7 7" />
                  </svg>
                </NextLink>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  )
}

export default ClientHomeView
