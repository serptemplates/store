"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"

import { AboutSection } from "@repo/ui/sections/AboutSection"
import { FeaturesSection } from "@repo/ui/sections/FeaturesSection"
import { PostsSection } from "@repo/ui/sections/PostsSection"
import { PricingCta } from "@repo/ui/sections/PricingCta"
import { SocialProofScreenshots } from "@repo/ui/sections/SocialProofScreenshots"
import { teamMembers } from "@/data/team"
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@repo/ui"
import { Footer as FooterComposite } from "@repo/ui/composites/Footer"
import { ProductMediaGallery } from "@/components/product/ProductMediaGallery"
import { FaqSection } from "@repo/ui/sections/FaqSection"
import { StickyPurchaseBar } from "@/components/product/StickyPurchaseBar"
import { ProductStructuredDataScripts } from "@/components/product/ProductStructuredDataScripts"
import { useAffiliateTracking } from "@/components/product/useAffiliateTracking"
import { getBrandLogoPath } from "@/lib/products/brand-logos"
import type { BlogPostMeta } from "@/lib/blog"
import { productToHomeTemplate } from "@/lib/products/product-adapter"
import { useProductCheckoutCta } from "@/components/product/useProductCheckoutCta"
import type { ProductData } from "@/lib/products/product-schema"
import { getReleaseBadgeText, isPreRelease } from "@/lib/products/release-status"
import type { SiteConfig } from "@/lib/site-config"
import { ProductStructuredData } from "@/schema/structured-data-components"
import type { ProductVideoEntry } from "@/lib/products/video"
import { canonicalizeStoreOrigin } from "@/lib/canonical-url"
import { GhlWaitlistModal } from "@/components/waitlist/GhlWaitlistModal"

export interface HybridProductPageViewProps {
  product: ProductData
  posts: BlogPostMeta[]
  siteConfig: SiteConfig
  videoEntries?: ProductVideoEntry[]
}

export function HybridProductPageView({ product, posts, siteConfig, videoEntries }: HybridProductPageViewProps) {
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0)
  const [showStickyBar, setShowStickyBar] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [showWaitlistModal, setShowWaitlistModal] = useState(false)
  const productIsPreRelease = isPreRelease(product)
  const releaseBadgeText = getReleaseBadgeText(product).replace("-", " ")

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

  const resolvedVideos = useMemo(
    () => (videoEntries ?? []).filter((entry): entry is ProductVideoEntry => Boolean(entry)),
    [videoEntries],
  )
  const selectedVideoEntry = resolvedVideos[selectedVideoIndex]

  const price = product.pricing
  const handle = product.slug
  const brandLogoPath = getBrandLogoPath(handle)
  const mainImageSource = brandLogoPath || product.featured_image
  const stickyImageSource = productIsPreRelease ? null : mainImageSource

  const allImages = useMemo(
    () =>
      [
        mainImageSource,
        ...(product.screenshots ?? []).map((screenshot) =>
          typeof screenshot === "string" ? screenshot : screenshot.url,
        ),
      ].filter((value): value is string => Boolean(value)),
    [mainImageSource, product.screenshots],
  )

  const showMediaGallery = !productIsPreRelease && allImages.length > 0

  const { affiliateId } = useAffiliateTracking()

  const {
    cta: resolvedCta,
    handleCtaClick: triggerCtaClick,
  } = useProductCheckoutCta({
    product,
    homeCta: {
      cta: homeProps.cta,
      ctaMode: homeProps.ctaMode,
      ctaHref: homeProps.ctaHref,
      ctaText: homeProps.ctaText,
      ctaTarget: homeProps.ctaTarget,
      ctaRel: homeProps.ctaRel,
      ctaOpensInNewTab: homeProps.ctaOpensInNewTab,
    },
    affiliateId,
    onShowWaitlist: () => setShowWaitlistModal(true),
  })

  const shouldOpenInNewTab = resolvedCta.opensInNewTab
  const resolvedCtaHref = resolvedCta.href
  const resolvedCtaRel = resolvedCta.rel

  const handleHeroCtaClick = useCallback(() => {
    triggerCtaClick("hero")
  }, [triggerCtaClick])

  const handlePricingCtaClick = useCallback(() => {
    triggerCtaClick("pricing")
  }, [triggerCtaClick])

  const handleStickyBarCheckoutClick = useCallback(() => {
    triggerCtaClick("sticky_bar")
  }, [triggerCtaClick])

  const handleWaitlistClick = useCallback(() => {
    setShowWaitlistModal(true)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const triggerHeight = 600
      setShowStickyBar(window.scrollY > triggerHeight)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (selectedVideoIndex >= resolvedVideos.length) {
      setSelectedVideoIndex(0)
    }
  }, [selectedVideoIndex, resolvedVideos.length])

  const footerSite = useMemo(() => ({ name: "SERP", url: "https://serp.co" }), [])
  const Footer = useCallback(() => <FooterComposite site={footerSite} />, [footerSite])
  const canonicalBaseUrl = canonicalizeStoreOrigin(typeof window !== "undefined" ? window.location.origin : undefined)
  const normalizedSlug = product.slug?.replace(/^\/+/, "") ?? ""
  const productUrl = normalizedSlug ? `${canonicalBaseUrl}/${normalizedSlug}` : canonicalBaseUrl

  return (
    <>
      <ProductStructuredDataScripts
        product={product}
        posts={posts}
        siteConfig={siteConfig}
        images={allImages}
        videoEntries={resolvedVideos}
      />
      <ProductStructuredData product={product} url={productUrl} />

      <StickyPurchaseBar
        product={product}
        priceLabel={price?.label ?? null}
        price={price?.price ?? null}
        originalPrice={price?.original_price ?? null}
        show={showStickyBar}
        brandLogoPath={brandLogoPath}
        mainImageSource={stickyImageSource}
        waitlistEnabled={productIsPreRelease}
        onWaitlistClick={handleWaitlistClick}
        checkoutCta={productIsPreRelease ? null : resolvedCta}
        onCheckoutClick={(event) => {
          event.preventDefault()
          handleStickyBarCheckoutClick()
        }}
      />

      <div className="container mx-auto px-4 py-8">
        <div className={`grid gap-8 ${showMediaGallery ? "lg:grid-cols-2" : ""}`}>
          {showMediaGallery && (
            <div>
              <ProductMediaGallery
                images={allImages}
                selectedIndex={selectedImageIndex}
                onSelect={setSelectedImageIndex}
                productName={product.name}
                brandLogoPath={brandLogoPath}
              />
            </div>
          )}

          <div>
            <nav className="text-sm mb-4">
              <Link href="/" className="text-gray-500 hover:text-gray-700">
                Home
              </Link>
              <span className="mx-2 text-gray-400">/</span>
              <span className="text-gray-900">{product.name}</span>
            </nav>

            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>

            <p className="text-gray-600 mb-4">
              {product.description && product.description.length > 300
                ? product.description.slice(0, 300).trim() + "..."
                : product.description}
            </p>

            {price && (
              <div className="mb-6">
                {productIsPreRelease ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                      {releaseBadgeText}
                    </span>
                    {price.price && <span className="text-2xl text-gray-500">Expected: {price.price}</span>}
                  </div>
                ) : (
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-bold text-gray-900">{price.price}</span>
                    {price.original_price && (
                      <>
                        <span className="text-2xl text-gray-400 line-through">{price.original_price}</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-red-100 text-red-800">
                          {Math.round(
                            ((parseFloat(price.original_price.replace("$", "")) -
                              parseFloat((price.price || "$0").replace("$", ""))) /
                              parseFloat(price.original_price.replace("$", ""))) *
                              100,
                          )}% OFF
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <span className="text-sm">Lifetime Updates</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-sm">Instant Download</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <span className="text-sm">24/7 Support</span>
              </div>
            </div>

            <div className="flex flex-col gap-4 mb-8">
              {productIsPreRelease ? (
                <button
                  type="button"
                  onClick={handleWaitlistClick}
                  className="w-full bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                  Get Notified
                </button>
              ) : (
                <a
                  href={resolvedCtaHref}
                  target={shouldOpenInNewTab ? "_blank" : "_self"}
                  rel={
                    shouldOpenInNewTab
                      ? resolvedCtaRel ?? "noopener noreferrer"
                      : resolvedCtaRel ?? undefined
                  }
                  className="inline-block w-full rounded-lg bg-blue-600 px-8 py-3 text-center font-semibold text-white transition hover:bg-blue-700"
                  onClick={(event) => {
                    event.preventDefault()
                    handleHeroCtaClick()
                  }}
                >
                  {price?.cta_text || "Proceed to Checkout"}
                </a>
              )}
              <button className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition w-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {resolvedVideos.length > 0 && (
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
              {selectedVideoEntry && (
                <iframe
                  key={selectedVideoEntry.slug}
                  src={selectedVideoEntry.embedUrl}
                  className="absolute inset-0 h-full w-full"
                  allowFullScreen
                  title={selectedVideoEntry.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                />
              )}
              {selectedVideoEntry && (
                <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-blue-700 shadow">
                  <Link href={selectedVideoEntry.watchPath}>View watch page</Link>
                </div>
              )}
            </div>

            {resolvedVideos.length > 1 && (
              <div className="flex items-center gap-2 mt-4 justify-center">
                {resolvedVideos.map((video, index) => (
                  <button
                    key={video.slug}
                    onClick={() => setSelectedVideoIndex(index)}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      selectedVideoIndex === index ? "w-8 bg-blue-600" : "w-2 bg-gray-300 hover:bg-gray-400"
                    }`}
                    aria-label={`Go to video ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-20">
        {product.features && product.features.length > 0 && (
          <FeaturesSection
            features={product.features.map((feature) => ({
              title: feature,
              description: "",
              icon: null,
            }))}
          />
        )}

        {/* Social Proof Screenshots */}
        <SocialProofScreenshots />

        {homeProps.faqs && homeProps.faqs.length > 0 && <FaqSection faqs={homeProps.faqs} />}

        {/* About Section */}
        <AboutSection team={teamMembers} />

        {resolvedPosts && resolvedPosts.length > 0 && (
          <PostsSection
            posts={resolvedPosts}
            Badge={Badge}
            Card={Card}
            CardHeader={CardHeader}
            CardTitle={CardTitle}
            CardContent={CardContent}
          />
        )}

        {homeProps.pricing && (
          <PricingCta
            {...homeProps.pricing}
            onCtaClick={handlePricingCtaClick}
            ctaLoading={false}
            ctaDisabled={false}
          />
        )}

        <Footer />
      </div>

      <GhlWaitlistModal open={showWaitlistModal} onClose={() => setShowWaitlistModal(false)} />
    </>
  )
}

export default HybridProductPageView
