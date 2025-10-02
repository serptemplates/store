"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { formatPrice } from "@/lib/products-data"
import { getBrandLogoPath } from "@/lib/brand-logos"
import { useAffiliateTracking } from "@/components/product/useAffiliateTracking"
import { useCheckoutRedirect } from "@/components/product/useCheckoutRedirect"
import { ProductStructuredDataScripts } from "@/components/product/ProductStructuredDataScripts"
import { StickyPurchaseBar } from "@/components/product/StickyPurchaseBar"
import type { ProductInfoSectionProps } from "@/components/product/ProductInfoSection"
import type { ProductBreadcrumbItem } from "@/components/product/ProductBreadcrumb"
import { HybridProductOverview } from "@/components/product/hybrid/HybridProductOverview"
import { HybridVideoShowcaseSection } from "@/components/product/hybrid/HybridVideoShowcaseSection"
import { HybridValueStackSection } from "@/components/product/hybrid/HybridValueStackSection"
import { HybridComparisonSection, type ComparisonRow } from "@/components/product/hybrid/HybridComparisonSection"
import { HybridIncludedStackSection } from "@/components/product/hybrid/HybridIncludedStackSection"

export interface HybridEcommerceLayoutProps {
  product: any
}

export function HybridEcommerceLayout({ product }: HybridEcommerceLayoutProps) {
  const price = product.variants?.[0]?.prices?.[0] || product.pricing
  const handle: string = product.handle || product.slug
  const brandLogoPath = getBrandLogoPath(handle)
  const mainImageSource: string | undefined = brandLogoPath || product.thumbnail || product.featured_image

  const images = useMemo(() => {
    const gallery: Array<string | undefined> = [
      mainImageSource,
      ...(product.screenshots ?? []).map((item: any) =>
        typeof item === "string" ? item : item?.url,
      ),
    ]

    return Array.from(new Set(gallery.filter(Boolean))) as string[]
  }, [mainImageSource, product.screenshots])

  const { affiliateId } = useAffiliateTracking()

  const fallbackUrl: string =
    product.purchase_url ||
    product.metadata?.purchase_url ||
    product.stripe?.checkoutUrl ||
    "#"

  const { isLoading: isCheckoutLoading, beginCheckout } = useCheckoutRedirect({
    offerId: handle,
    affiliateId,
    metadata: { landerId: handle },
    endpoint: "/api/checkout/session",
    fallbackUrl,
  })

  const [showStickyBar, setShowStickyBar] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const triggerHeight = 520
      setShowStickyBar(window.scrollY > triggerHeight)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const displayPrice = price?.amount
    ? formatPrice(price.amount, price.currency_code || "USD")
    : price?.price ?? null

  const priceLabel = price?.label || product.pricing?.label || product.metadata?.price_label || null
  const originalPrice = price?.original_price || product.metadata?.original_price || null

  const benefits = useMemo(() => {
    if (Array.isArray(product.pricing?.benefits)) {
      return product.pricing.benefits as string[]
    }

    if (Array.isArray(product.metadata?.benefits)) {
      return product.metadata.benefits as string[]
    }

    return [] as string[]
  }, [product.metadata?.benefits, product.pricing?.benefits])

  const featureList = useMemo(() => {
    if (Array.isArray(product.features)) {
      return product.features as string[]
    }

    if (Array.isArray(product.metadata?.features)) {
      return product.metadata.features as string[]
    }

    return [] as string[]
  }, [product.features, product.metadata?.features])

  const videoEmbeds: string[] = useMemo(() => product.product_videos ?? [], [product.product_videos])
  const githubUrl: string | undefined = product.github_repo_url || product.metadata?.github_repo_url

  const includedItems = useMemo(() => (
    product.metadata?.deliverables ?? []
  ).map((item: unknown) => String(item)), [product.metadata?.deliverables])

  const comparisonRows: ComparisonRow[] = useMemo(() => [
    {
      label: "Bandwidth optimized",
      included: true,
      competitor: "Limited to 720p streams",
    },
    {
      label: "Bulk syndication",
      included: Boolean(product.metadata?.bulk_tools),
      competitor: "Manual upload pipelines",
    },
    {
      label: "Automations",
      included: Boolean(product.metadata?.automations),
      competitor: "Engineering backlog",
    },
    {
      label: "Documentation",
      included: true,
      competitor: "Sparse or outdated",
    },
  ], [product.metadata?.bulk_tools, product.metadata?.automations])

  const handleWaitlistClick = useCallback(() => {
    if (product.waitlist_url) {
      window.open(product.waitlist_url, "_blank", "noopener,noreferrer")
    }
  }, [product.waitlist_url])

  const breadcrumbItems: ProductBreadcrumbItem[] = useMemo(() => (
    [
      { label: "Shop", href: "/shop" },
      { label: "Products", href: "/shop" },
      { label: product.title || product.name },
    ]
  ), [product.title, product.name])

  const infoSectionProps: ProductInfoSectionProps = useMemo(() => ({
    title: product.title || product.name,
    description: product.description,
    displayPrice,
    originalPrice,
    priceLabel,
    onCheckout: beginCheckout,
    checkoutCtaLabel: product.pricing?.cta_text || "Get Instant Access with Card",
    isCheckoutLoading,
    showWaitlist: Boolean(product.coming_soon),
    onWaitlistClick: handleWaitlistClick,
    payPalProps: !product.coming_soon ? {
      offerId: handle,
      price: displayPrice || "0",
      affiliateId,
      metadata: { landerId: handle },
      buttonText: "Pay with PayPal",
    } : null,
    benefits,
    features: featureList,
    githubUrl,
  }), [
    product.title,
    product.name,
    product.description,
    product.pricing?.cta_text,
    product.coming_soon,
    displayPrice,
    originalPrice,
    priceLabel,
    beginCheckout,
    isCheckoutLoading,
    handleWaitlistClick,
    handle,
    affiliateId,
    benefits,
    featureList,
    githubUrl,
  ])

  return (
    <>
      <ProductStructuredDataScripts product={product} images={images} />

      <StickyPurchaseBar
        product={product}
        priceLabel={priceLabel}
        price={displayPrice}
        originalPrice={originalPrice}
        show={showStickyBar}
        brandLogoPath={brandLogoPath}
        mainImageSource={mainImageSource}
        affiliateId={affiliateId}
      />

      <div className="container mx-auto px-4 py-10 space-y-12">
        <HybridProductOverview
          breadcrumbItems={breadcrumbItems}
          productName={product.title || product.name}
          images={images}
          selectedImageIndex={selectedImageIndex}
          onSelectImage={setSelectedImageIndex}
          brandLogoPath={brandLogoPath}
          infoProps={infoSectionProps}
        />

        <HybridVideoShowcaseSection
          videos={videoEmbeds}
          selectedIndex={selectedVideoIndex}
          onSelect={setSelectedVideoIndex}
          productName={product.title || product.name}
        />

        <HybridValueStackSection />

        <HybridComparisonSection rows={comparisonRows} />

        <HybridIncludedStackSection items={includedItems} />
      </div>
    </>
  )
}

export default HybridEcommerceLayout
