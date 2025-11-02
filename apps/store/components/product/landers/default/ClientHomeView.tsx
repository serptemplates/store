/* eslint-disable react-hooks/rules-of-hooks */
"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

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

  const homeProps = productToHomeTemplate(product, resolvedPosts)
  const derivedCategories =
    Array.isArray(homeProps.categories) && homeProps.categories.length > 0
      ? homeProps.categories
      : deriveProductCategories(product)
  const resolvedVideos = videoEntries
  const isPreRelease = product.status === "pre_release"
  const videosToDisplay = isPreRelease ? [] : resolvedVideos.slice(0, 3)
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

  const shouldOpenInNewTab = resolvedCta.opensInNewTab
  const [resolvedCtaHrefWithDub, setResolvedCtaHrefWithDub] = useState(resolvedCta.href)
  const resolvedCtaHref = resolvedCtaHrefWithDub
  const resolvedCtaText = resolvedCta.text
  const resolvedCtaRel = resolvedCta.rel
  const videoSection = videosToDisplay.length > 0 ? <ProductVideosSection videos={videosToDisplay} /> : null

  const showPosts = siteConfig.blog?.enabled !== false

  const Navbar = useCallback(() => <PrimaryNavbar {...navProps} />, [navProps])

  const footerSite = useMemo(() => ({ name: "SERP", url: "https://serp.co" }), [])
  const Footer = useCallback(() => <FooterComposite site={footerSite} />, [footerSite])

  const productImages = useMemo(() => {
    if (isPreRelease) {
      return [] as string[]
    }
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
  }, [isPreRelease, product])
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 320)
    }

    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [setShowStickyBar])

  // Client-side enhancement: append Dub click ID to Stripe Payment Links
  // so Dub can attribute purchases made via Payment Links.
  useEffect(() => {
    try {
      if (typeof window === "undefined") return
      const href = resolvedCta.href
      if (!href || typeof href !== "string") {
        setResolvedCtaHrefWithDub(href)
        return
      }

      const url = new URL(href, window.location.origin)
      const hostname = url.hostname

      const isStripeHost = hostname === "buy.stripe.com" || hostname === "checkout.stripe.com"
      if (!isStripeHost) {
        setResolvedCtaHrefWithDub(url.toString())
        return
      }

      const cookies = document.cookie.split(";").map((c) => c.trim())
      const dubCookie = cookies.find((c) => c.startsWith("dub_id="))
      const dubId = dubCookie ? decodeURIComponent(dubCookie.split("=")[1] || "").trim() : ""

      if (dubId) {
        url.searchParams.set("client_reference_id", dubId)
      }

      setResolvedCtaHrefWithDub(url.toString())
    } catch {
      setResolvedCtaHrefWithDub(resolvedCta.href)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedCta.href])

  const handlePrimaryCtaClick = useCallback(() => {
    handleCtaClick("pricing")
  }, [handleCtaClick])

  const handleStickyCtaClick = useCallback(() => {
    handleCtaClick("sticky_bar")
  }, [handleCtaClick])

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
                originalPrice: homeProps.pricing.originalPrice ?? undefined,
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

      <ProductStickyBar
        variant="default"
        show={showStickyBar}
        productName={product.name}
        ctaLabel={resolvedCtaText}
        onClick={handleStickyCtaClick}
        href={resolvedCtaHref}
        openInNewTab={shouldOpenInNewTab}
        rel={resolvedCtaRel}
      />

      <GhlWaitlistModal open={waitlist.isOpen} onClose={waitlist.close} />
    </>
  )
}

export default ClientHomeView
