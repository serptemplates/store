"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { FeaturesSection, PostsSection, PricingCta, SocialProofScreenshots } from "@repo/templates"
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@repo/ui"
import { Footer as FooterComposite } from "@repo/ui/composites/Footer"

// Removed: PayPalCheckoutButton - now using unified checkout page
import { ProductMediaGallery } from "@/components/product/ProductMediaGallery"
import { FaqSection } from "@repo/templates"
import { StickyPurchaseBar } from "@/components/product/StickyPurchaseBar"
import { ProductStructuredDataScripts } from "@/components/product/ProductStructuredDataScripts"
import { useAffiliateTracking } from "@/components/product/useAffiliateTracking"
// Removed: useCheckoutRedirect - now using direct link to unified checkout page
import { getBrandLogoPath } from "@/lib/brand-logos"
import type { BlogPostMeta } from "@/lib/blog"
import { productToHomeTemplate } from "@/lib/product-adapter"
import type { ProductData } from "@/lib/product-schema"
import type { SiteConfig } from "@/lib/site-config"
import { ProductStructuredData } from "@/schema/structured-data-components"

export interface HybridProductPageViewProps {
  product: ProductData
  posts: BlogPostMeta[]
  siteConfig: SiteConfig
}

export function HybridProductPageView({ product, posts, siteConfig }: HybridProductPageViewProps) {
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0)
  const [showStickyBar, setShowStickyBar] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const router = useRouter()

  const homeProps = productToHomeTemplate(product, posts)

  const price = product.pricing
  const handle = product.slug
  const brandLogoPath = getBrandLogoPath(handle)
  const mainImageSource = brandLogoPath || product.featured_image

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

  const { affiliateId } = useAffiliateTracking()

  const handleCheckout = useCallback(() => {
    const checkoutUrl = `/checkout?product=${product.slug}${affiliateId ? `&aff=${affiliateId}` : ''}`
    router.push(checkoutUrl as any)
  }, [product.slug, affiliateId, router])

  useEffect(() => {
    const handleScroll = () => {
      const triggerHeight = 600
      setShowStickyBar(window.scrollY > triggerHeight)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const Footer = useCallback(() => <FooterComposite />, [])
  const productUrl = typeof window !== "undefined" ? `${window.location.origin}/${product.slug}` : `https://store.com/${product.slug}`

  return (
    <>
      <ProductStructuredDataScripts product={product} posts={posts} siteConfig={siteConfig} images={allImages} />
      <ProductStructuredData product={product} url={productUrl} />

      <header className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-xl font-bold">
              {siteConfig.site?.name || "Store"}
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                Home
              </Link>
              <Link href="/shop" className="text-gray-600 hover:text-gray-900">
                Shop
              </Link>
              <Link href="/blog" className="text-gray-600 hover:text-gray-900">
                Blog
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <StickyPurchaseBar
        product={product}
        priceLabel={price?.label ?? null}
        price={price?.price ?? null}
        originalPrice={price?.original_price ?? null}
        show={showStickyBar}
        brandLogoPath={brandLogoPath}
        mainImageSource={mainImageSource}
        affiliateId={affiliateId}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <ProductMediaGallery
              images={allImages}
              selectedIndex={selectedImageIndex}
              onSelect={setSelectedImageIndex}
              productName={product.name}
              brandLogoPath={brandLogoPath}
            />
          </div>

          <div>
            <nav className="text-sm mb-4">
              <Link href="/" className="text-gray-500 hover:text-gray-700">
                Home
              </Link>
              <span className="mx-2 text-gray-400">/</span>
              <Link href="/shop" className="text-gray-500 hover:text-gray-700">
                Shop
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
                {product.coming_soon ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                      Coming Soon
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
              {product.coming_soon ? (
                <button
                  onClick={() => {
                    if (product.waitlist_url) {
                      window.open(product.waitlist_url, "_blank", "noopener,noreferrer")
                    }
                  }}
                  className="w-full bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
                >
                  Join Waitlist
                </button>
              ) : (
                <Link
                  href={`/checkout?product=${product.slug}${affiliateId ? `&aff=${affiliateId}` : ''}`}
                  className="w-full bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition inline-block text-center"
                >
                  {price?.cta_text || "Proceed to Checkout"}
                </Link>
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

      {product.product_videos && product.product_videos.length > 0 && (
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
              <iframe
                key={selectedVideoIndex}
                src={product.product_videos[selectedVideoIndex]
                  .replace("watch?v=", "embed/")
                  .replace("vimeo.com/", "player.vimeo.com/video/")
                  .replace("youtu.be/", "youtube.com/embed/")}
                className="absolute inset-0 w-full h-full"
                allowFullScreen
                title={`Product Demo Video ${selectedVideoIndex + 1}`}
              />
            </div>

            {product.product_videos.length > 1 && (
              <div className="flex items-center gap-2 mt-4 justify-center">
                {product.product_videos.map((_, index) => (
                  <button
                    key={index}
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

        {posts && posts.length > 0 && (
          <PostsSection
            posts={posts}
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
            onCtaClick={handleCheckout}
            ctaLoading={false}
            ctaDisabled={false}
          />
        )}

        <Footer />
      </div>
    </>
  )
}

export default HybridProductPageView
