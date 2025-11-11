/* eslint-disable react-hooks/rules-of-hooks */
"use client"

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react"

import { HomeTemplate } from "./HomeTemplate"
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Input } from "@repo/ui"
import { Footer as FooterComposite } from "@repo/ui/composites/Footer"

import { ProductStructuredDataScripts } from "@/components/product/ProductStructuredDataScripts"
import { ProductStructuredData } from "@/schema/structured-data-components"
import PrimaryNavbar from "@/components/navigation/PrimaryNavbar"
import type { BlogPostMeta } from "@/lib/blog"
import type { PrimaryNavProps } from "@/lib/navigation"
import { productToHomeTemplate } from "@/lib/products/product-adapter"
import type { ProductData } from "@/lib/products/product-schema"
import type { ProductVideoEntry } from "@/lib/products/video"
import type { SiteConfig } from "@/lib/site-config"
import { canonicalizeStoreOrigin } from "@/lib/canonical-url"
import { GhlWaitlistModal } from "@/components/waitlist/GhlWaitlistModal"
import { normalizeProductAssetPath } from "@/lib/products/asset-paths"
import { useProductPageExperience } from "@/components/product/hooks/useProductPageExperience"
import { ProductVideosSection } from "@/components/product/shared/ProductVideosSection"
import { ProductStickyBar } from "@/components/product/shared/ProductStickyBar"
import { deriveProductCategories } from "@/lib/products/categories"

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

  const showPrices = siteConfig.storefront?.showPrices !== false
  const homeProps = productToHomeTemplate(product, resolvedPosts, { showPrices })
  const derivedCategories =
    Array.isArray(homeProps.categories) && homeProps.categories.length > 0
      ? homeProps.categories
      : deriveProductCategories(product)
  const resolvedVideos = videoEntries
  const isPreRelease = product.status === "pre_release"
  // Always render videos when available, even for pre_release
  const videosToDisplay = resolvedVideos.slice(0, 3)
  const [showStickyBar, setShowStickyBar] = useState(false)
  const experience = useProductPageExperience(
    product,
    {
      cta: homeProps.cta,
      ctaMode: homeProps.ctaMode,
      ctaHref: homeProps.ctaHref,
      ctaText: homeProps.ctaText,
      ctaTarget: homeProps.ctaTarget,
      ctaRel: homeProps.ctaRel,
      ctaOpensInNewTab: homeProps.ctaOpensInNewTab,
    },
    { analytics: true },
  )
  const { resolvedCta, handleCtaClick, waitlist, checkoutSuccess } = experience

  // Set up Dub-aware checkout handler
  // This intercepts buy button clicks to create programmatic checkout sessions
  // with proper Dub attribution metadata when stripe.price_id is available
  const isInternalCheckoutRoute = (() => {
    if (typeof resolvedCta.href !== "string") return false
    if (resolvedCta.href.startsWith("/checkout/")) return true
    try {
      const url = new URL(resolvedCta.href)
      return url.pathname.startsWith("/checkout/")
    } catch {
      return false
    }
  })()
  const renderedCheckoutHref = (() => {
    if (!isInternalCheckoutRoute || typeof resolvedCta.href !== "string") return resolvedCta.href
    // If we’re on localhost and the CTA points to apps.serp.co/checkout, convert to a local relative path for easier testing
    try {
      // window only exists client-side; on SSR just return the absolute href
      if (typeof window === 'undefined') return resolvedCta.href
      const host = window.location.hostname
      const isLocal = host === 'localhost' || host === '127.0.0.1'
      const u = new URL(resolvedCta.href, window.location.origin)
      if (isLocal && u.pathname.startsWith('/checkout/')) {
        return `${u.pathname}${u.search ?? ''}`
      }
    } catch {}
    return resolvedCta.href
  })()
  // If CTA is explicitly the internal checkout route, render it (optionally localhost-normalized)
  // Otherwise, use "#" when we have a price ID (intercept to add Dub metadata)
  const resolvedCtaHref = isInternalCheckoutRoute ? renderedCheckoutHref : resolvedCta.href
  const resolvedCtaText = resolvedCta.text
  const resolvedCtaRel = resolvedCta.rel
  const normalizedCta = useMemo(
    () => ({ ...resolvedCta, href: resolvedCtaHref }),
    [resolvedCta, resolvedCtaHref],
  )
  const videoSection = videosToDisplay.length > 0 ? <ProductVideosSection videos={videosToDisplay} /> : null

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
        candidates
          .map((value) => normalizeProductAssetPath(typeof value === "string" ? value : undefined))
          .filter((value): value is string => Boolean(value)),
      ),
    )
  }, [product])
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 320)
    }

    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [setShowStickyBar])

  // Handle buy button clicks with Dub attribution
  // Intercepts primary CTA clicks to create programmatic checkout sessions
  const handlePrimaryCtaClick = useCallback(() => {
    handleCtaClick("pricing")
  }, [handleCtaClick])

  const handleStickyCheckoutClick = useCallback(
    (event?: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      event?.preventDefault?.()
      handleCtaClick("sticky_bar")
    },
    [handleCtaClick],
  )

  const siteUrl = canonicalizeStoreOrigin(siteConfig.site?.domain)
  const productPath = product.slug.startsWith("/") ? product.slug : `/${product.slug}`
  // Build a deterministic product URL from configured site origin to avoid SSR/CSR mismatches
  const productUrl = useMemo(() => {
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
        categories={derivedCategories}
        showPosts={showPosts}
        posts={showPosts ? homeProps.posts : []}
        postsTitle={showPosts ? homeProps.postsTitle : undefined}
        cta={normalizedCta}
        ctaMode={normalizedCta.mode}
        ctaHref={normalizedCta.href}
        ctaText={resolvedCtaText}
        ctaTarget={normalizedCta.target}
        ctaRel={resolvedCtaRel}
        ctaOpensInNewTab={normalizedCta.opensInNewTab}
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
                originalPrice: homeProps.pricing.originalPrice ?? undefined,
                onCtaClick: handlePrimaryCtaClick,
                ctaLoading: false,
                ctaDisabled: false,
                ctaHref: normalizedCta.href,
                ctaText: homeProps.pricing?.ctaText ?? resolvedCtaText,
                ctaExtra: null,
              }
            : undefined
      }
      />

      <ProductStickyBar
        show={showStickyBar}
        product={product}
        waitlistEnabled={isPreRelease}
        onWaitlistClick={waitlist.open}
        checkoutCta={normalizedCta}
        onCheckoutClick={handleStickyCheckoutClick}
      />

      <GhlWaitlistModal open={waitlist.isOpen} onClose={waitlist.close} />
    </>
  )
}

export default ClientHomeView
