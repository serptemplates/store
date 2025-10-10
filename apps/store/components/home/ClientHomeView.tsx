/* eslint-disable react-hooks/rules-of-hooks */
"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Script from "next/script"
import NextLink from "next/link"
import Image from "next/image"

import { HomeTemplate } from "@repo/templates"
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Input } from "@repo/ui"
import { Footer as FooterComposite } from "@repo/ui/composites/Footer"
import { cn } from "@repo/ui/lib/utils"

import { useAffiliateTracking } from "@/components/product/useAffiliateTracking"
import PrimaryNavbar from "@/components/navigation/PrimaryNavbar"
import type { BlogPostMeta } from "@/lib/blog"
import type { PrimaryNavProps } from "@/lib/navigation"
import { trackCheckoutSuccessBanner, trackProductCheckoutClick, trackProductPageView } from "@/lib/analytics/product"
import { productToHomeTemplate } from "@/lib/products/product-adapter"
import type { ProductData } from "@/lib/products/product-schema"
import type { ProductVideoEntry } from "@/lib/products/video"
import type { SiteConfig } from "@/lib/site-config"

export type ClientHomeProps = {
  product: ProductData
  posts: BlogPostMeta[]
  siteConfig: SiteConfig
  navProps: PrimaryNavProps
  videoEntries: ProductVideoEntry[]
}

export function ClientHomeView({ product, posts, siteConfig, navProps, videoEntries }: ClientHomeProps) {
  const homeProps = productToHomeTemplate(product, posts)
  const resolvedVideos = videoEntries
  const videosToDisplay = resolvedVideos.slice(0, 3)
  const { affiliateId, checkoutSuccess } = useAffiliateTracking()
  const checkoutHrefBase = `/checkout?product=${product.slug}`
  const checkoutHref = affiliateId ? `${checkoutHrefBase}&aff=${affiliateId}` : checkoutHrefBase
  const hasExternalDestination =
    typeof product.buy_button_destination === "string" && product.buy_button_destination.trim().length > 0
  const hasEmbeddedCheckout =
    !hasExternalDestination &&
    (Boolean(product.stripe?.price_id) || Boolean(product.stripe?.test_price_id))
  const fallbackCtaCandidates = [
    homeProps.ctaHref,
    product.buy_button_destination,
    product.purchase_url,
    product.product_page_url,
  ].filter((value): value is string => Boolean(value && value.trim().length > 0))
  const fallbackCtaHref = fallbackCtaCandidates[0]
  const primaryCtaHref = hasEmbeddedCheckout ? checkoutHref : fallbackCtaHref
  const resolvedCtaHref = primaryCtaHref ?? checkoutHref
  const isInternalHref = resolvedCtaHref.startsWith("/") || resolvedCtaHref.startsWith("#")
  const useExternalBuyDestination = !hasEmbeddedCheckout && !isInternalHref
  const videoSection =
    videosToDisplay.length > 0 ? (
      <section className="bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex flex-col gap-3 text-center">
            <span className="mx-auto inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-blue-700">
              Watch
            </span>
            <h2 className="text-3xl font-semibold text-gray-900">Videos</h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {videosToDisplay.map((video) => (
              <article
                key={video.watchPath}
                className="flex h-full flex-col overflow-hidden rounded-2xl bg-white transition-transform hover:-translate-y-1"
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
                </NextLink>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <h3 className="text-base font-medium text-gray-900">
                    <NextLink href={video.watchPath} className="hover:text-blue-600">
                      {video.title}
                    </NextLink>
                  </h3>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <NextLink
              href="/videos"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              More videos
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </NextLink>
          </div>
        </div>
      </section>
    ) : null

  const showPosts = siteConfig.blog?.enabled !== false

  const productNavProps = useMemo(
    () => ({
      ...navProps,
      ctaHref: null,
      ctaText: null,
      showCta: false,
    }),
    [navProps],
  )

  const Navbar = useCallback(() => <PrimaryNavbar {...productNavProps} />, [productNavProps])

  const footerSite = useMemo(() => ({ name: "SERP", url: "https://serp.co" }), [])
  const Footer = useCallback(() => <FooterComposite site={footerSite} />, [footerSite])

  const [showStickyBar, setShowStickyBar] = useState(false)

  useEffect(() => {
    trackProductPageView(product, { affiliateId })
  }, [product, affiliateId])

  useEffect(() => {
    if (checkoutSuccess) {
      trackCheckoutSuccessBanner(product, { affiliateId })
    }
  }, [checkoutSuccess, product, affiliateId])

  useEffect(() => {
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 320)
    }

    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handlePrimaryCtaClick = useCallback(() => {
    trackProductCheckoutClick(product, {
      placement: "pricing",
      destination: useExternalBuyDestination ? "external" : "checkout",
      affiliateId,
    })

    if (useExternalBuyDestination) {
      window.open(resolvedCtaHref, "_blank", "noopener,noreferrer")
    } else {
      window.location.href = resolvedCtaHref
    }
  }, [product, useExternalBuyDestination, resolvedCtaHref, affiliateId])

  const handleStickyCtaClick = useCallback(() => {
    trackProductCheckoutClick(product, {
      placement: "sticky_bar",
      destination: useExternalBuyDestination ? "external" : "checkout",
      affiliateId,
    })

    if (useExternalBuyDestination) {
      window.open(resolvedCtaHref, "_blank", "noopener,noreferrer")
    } else {
      window.location.href = resolvedCtaHref
    }
  }, [product, useExternalBuyDestination, resolvedCtaHref, affiliateId])

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
        ctaHref={resolvedCtaHref}
        ctaText={homeProps.ctaText ?? "Get It Now"}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Products", href: "/#products" },
          { label: product.name },
        ]}
        videoSection={videoSection}
        pricing={
          homeProps.pricing
            ? {
                ...homeProps.pricing,
                originalPrice: homeProps.pricing.originalPrice || "$27.99",
                priceNote: "Use the product on a single project",
                onCtaClick: handlePrimaryCtaClick,
                ctaLoading: false,
                ctaDisabled: false,
                ctaHref: resolvedCtaHref,
                ctaText: homeProps.pricing?.ctaText ?? homeProps.ctaText ?? "GET IT NOW",
                ctaExtra: null,
              }
            : undefined
        }
      />

      <StickyProductCTA
        show={showStickyBar}
        productName={product.name}
        onCtaClick={handleStickyCtaClick}
        ctaHref={resolvedCtaHref}
        external={useExternalBuyDestination}
      />
    </>
  )
}

export default ClientHomeView

type StickyProductCTAProps = {
  show: boolean
  productName: string
  onCtaClick: () => void
  ctaHref: string
  external: boolean
}

function StickyProductCTA({ show, productName, onCtaClick, ctaHref, external }: StickyProductCTAProps) {
  const ctaClasses = "cta-pulse inline-flex items-center justify-center gap-2 rounded-md bg-gradient-to-r from-indigo-500 via-indigo-500 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-[0_12px_20px_-12px_rgba(79,70,229,0.65)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_32px_-14px_rgba(79,70,229,0.7)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500";
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[80] transition-transform duration-200",
        show ? "translate-y-0" : "-translate-y-full"
      )}
    >
      <div className="pointer-events-auto border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="container flex h-14 items-center justify-between gap-4">
          <span className="line-clamp-1 text-sm font-semibold text-foreground">{productName}</span>
          {external ? (
            <a
              href={ctaHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => {
                event.preventDefault();
                onCtaClick();
              }}
              className={ctaClasses}
            >
              <span aria-hidden className="text-base">🚀</span>
              <span>GET IT NOW</span>
            </a>
          ) : (
            <button type="button" onClick={onCtaClick} className={ctaClasses}>
              <span aria-hidden className="text-base">🚀</span>
              <span>GET IT NOW</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
