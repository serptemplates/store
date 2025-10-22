/* eslint-disable react-hooks/rules-of-hooks */
"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import NextLink from "next/link"
import Image from "next/image"

import { HomeTemplate } from "./HomeTemplate"
import type { ResolvedHomeCta } from "./home-template.types"
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Input } from "@repo/ui"
import { Footer as FooterComposite } from "@repo/ui/composites/Footer"
import { cn } from "@repo/ui/lib/utils"

import { useAffiliateTracking } from "@/components/product/useAffiliateTracking"
import { ProductStructuredDataScripts } from "@/components/product/ProductStructuredDataScripts"
import { ProductStructuredData } from "@/schema/structured-data-components"
import PrimaryNavbar from "@/components/navigation/PrimaryNavbar"
import type { BlogPostMeta } from "@/lib/blog"
import type { PrimaryNavProps } from "@/lib/navigation"
import { trackCheckoutSuccessBanner, trackProductCheckoutClick, trackProductPageView } from "@/lib/analytics/product"
import { productToHomeTemplate } from "@/lib/products/product-adapter"
import type { ProductData } from "@/lib/products/product-schema"
import type { ProductVideoEntry } from "@/lib/products/video"
import type { SiteConfig } from "@/lib/site-config"
import { canonicalizeStoreOrigin } from "@/lib/canonical-url"

export type ClientHomeProps = {
  product: ProductData
  posts: BlogPostMeta[]
  siteConfig: SiteConfig
  navProps: PrimaryNavProps
  videoEntries: ProductVideoEntry[]
}

export function ClientHomeView({ product, posts, siteConfig, navProps, videoEntries }: ClientHomeProps) {
  const resolvedPosts = useMemo(() => {
    const desired = product.related_posts ?? []
    if (!desired.length) {
      return posts
    }
    const order = new Map(desired.map((slug, index) => [slug, index]))
    return posts
      .filter((post) => order.has(post.slug))
      .sort((a, b) => (order.get(a.slug)! - order.get(b.slug)!))
  }, [posts, product.related_posts])

  const homeProps = productToHomeTemplate(product, resolvedPosts)
  const resolvedVideos = videoEntries
  const videosToDisplay = resolvedVideos.slice(0, 3)
  const { affiliateId, checkoutSuccess } = useAffiliateTracking()
  const checkoutHrefBase = `/checkout?product=${product.slug}`
  const checkoutHref = affiliateId ? `${checkoutHrefBase}&aff=${affiliateId}` : checkoutHrefBase
  const fallbackMode: ResolvedHomeCta["mode"] =
    homeProps.ctaMode
      ?? (typeof homeProps.ctaHref === "string" && homeProps.ctaHref.startsWith("/checkout")
        ? "checkout"
        : "external")

  const baseCta: ResolvedHomeCta =
    homeProps.cta ?? {
      mode: fallbackMode,
      href: homeProps.ctaHref ?? checkoutHrefBase,
      text: homeProps.ctaText ?? "Get It Now",
      target: homeProps.ctaTarget ?? (homeProps.ctaOpensInNewTab ? "_blank" : "_self"),
      rel: homeProps.ctaRel,
      opensInNewTab: homeProps.ctaOpensInNewTab ?? (homeProps.ctaTarget === "_blank"),
    }
  const resolvedCta: ResolvedHomeCta =
    baseCta.mode === "checkout"
      ? {
          ...baseCta,
          href: checkoutHref,
          opensInNewTab: false,
          target: "_self",
          rel: baseCta.rel,
        }
      : baseCta
  const isCheckoutMode = resolvedCta.mode === "checkout"
  const shouldOpenInNewTab = !isCheckoutMode && resolvedCta.opensInNewTab
  const resolvedCtaHref = resolvedCta.href
  const resolvedCtaText = resolvedCta.text
  const resolvedCtaRel = resolvedCta.rel
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
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      quality={85}
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k="
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

  const Navbar = useCallback(() => <PrimaryNavbar {...navProps} />, [navProps])

  const footerSite = useMemo(() => ({ name: "SERP", url: "https://serp.co" }), [])
  const Footer = useCallback(() => <FooterComposite site={footerSite} />, [footerSite])

  const productImages = useMemo(() => {
    const candidates = [
      product.featured_image,
      product.featured_image_gif,
      ...(Array.isArray(product.screenshots)
        ? product.screenshots.map((screenshot) =>
            typeof screenshot === "string" ? screenshot : screenshot.url,
          )
        : []),
    ]

    return Array.from(
      new Set(
        candidates.filter((value): value is string => Boolean(value && value.trim().length > 0)),
      ),
    )
  }, [product])

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

  const analyticsDestination: "checkout" | "external" | "waitlist" =
    resolvedCta.mode === "pre_release" ? "waitlist" : isCheckoutMode ? "checkout" : "external"

  const navigateToCta = useCallback(() => {
    if (isCheckoutMode) {
      window.location.href = resolvedCtaHref
      return
    }

    if (shouldOpenInNewTab) {
      window.open(resolvedCtaHref, "_blank", "noopener,noreferrer")
    } else {
      window.location.href = resolvedCtaHref
    }
  }, [isCheckoutMode, resolvedCtaHref, shouldOpenInNewTab])

  const handlePrimaryCtaClick = useCallback(() => {
    trackProductCheckoutClick(product, {
      placement: "pricing",
      destination: analyticsDestination,
      affiliateId,
    })

    navigateToCta()
  }, [product, analyticsDestination, affiliateId, navigateToCta])

  const handleStickyCtaClick = useCallback(() => {
    trackProductCheckoutClick(product, {
      placement: "sticky_bar",
      destination: analyticsDestination,
      affiliateId,
    })

    navigateToCta()
  }, [product, analyticsDestination, affiliateId, navigateToCta])

  const siteUrl = canonicalizeStoreOrigin(siteConfig.site?.domain)
  const productPath = product.slug.startsWith("/") ? product.slug : `/${product.slug}`
  const productUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      return `${window.location.origin.replace(/\/$/, "")}${productPath}`
    }

    return `${siteUrl.replace(/\/$/, "")}${productPath}`
  }, [productPath, siteUrl])

  return (
    <>
      <ProductStructuredDataScripts
        product={product}
        posts={resolvedPosts}
        siteConfig={siteConfig}
        images={productImages}
        videoEntries={resolvedVideos}
      />

      <ProductStructuredData product={product} url={productUrl} />

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
        cta={resolvedCta}
        ctaMode={resolvedCta.mode}
        ctaHref={resolvedCtaHref}
        ctaText={resolvedCtaText}
        ctaTarget={resolvedCta.target}
        ctaRel={resolvedCtaRel}
        ctaOpensInNewTab={resolvedCta.opensInNewTab}
        onPrimaryCtaClick={handlePrimaryCtaClick}
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
                onCtaClick: handlePrimaryCtaClick,
                ctaLoading: false,
                ctaDisabled: false,
                ctaHref: resolvedCtaHref,
                ctaText: homeProps.pricing?.ctaText ?? resolvedCtaText,
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
        label={resolvedCtaText}
        openInNewTab={shouldOpenInNewTab}
        rel={resolvedCtaRel}
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
  label: string
  openInNewTab: boolean
  rel?: string
}

function StickyProductCTA({ show, productName, onCtaClick, ctaHref, label, openInNewTab, rel }: StickyProductCTAProps) {
  const ctaClasses = "cta-pulse inline-flex items-center justify-center gap-2 rounded-md bg-gradient-to-r from-indigo-500 via-indigo-500 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-[0_12px_20px_-12px_rgba(79,70,229,0.65)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_32px_-14px_rgba(79,70,229,0.7)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500";
  const trimmedLabel = label.trim();
  const displayLabel = trimmedLabel.length > 0 ? trimmedLabel.toUpperCase() : "GET IT NOW";
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
          {openInNewTab ? (
            <a
              href={ctaHref}
              target="_blank"
              rel={rel ?? "noopener noreferrer"}
              onClick={(event) => {
                event.preventDefault();
                onCtaClick();
              }}
              className={ctaClasses}
            >
              <span aria-hidden className="text-base">🚀</span>
              <span>{displayLabel}</span>
            </a>
          ) : (
            <button type="button" onClick={onCtaClick} className={ctaClasses}>
              <span aria-hidden className="text-base">🚀</span>
              <span>{displayLabel}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
