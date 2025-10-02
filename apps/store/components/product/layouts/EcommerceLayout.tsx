"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { formatPrice } from "@/lib/products-data"
import { getBrandLogoPath } from "@/lib/brand-logos"
import { useAffiliateTracking } from "@/components/product/useAffiliateTracking"
import { StickyPurchaseBar } from "@/components/product/StickyPurchaseBar"
import { HybridProductOverview } from "@/components/product/hybrid/HybridProductOverview"
import type { ProductInfoSectionProps } from "@/components/product/ProductInfoSection"
import type { ProductBreadcrumbItem } from "@/components/product/ProductBreadcrumb"

export interface EcommerceLayoutProps {
  product: any
}

export function EcommerceLayout({ product }: EcommerceLayoutProps) {
  const variantPrice = product.variants?.[0]?.prices?.[0]
  const price = variantPrice || product.pricing
  const handle: string = product.handle || product.slug
  const brandLogoPath = getBrandLogoPath(handle)
  const mainImageSource: string | undefined = brandLogoPath || product.thumbnail || product.featured_image

  const images = useMemo(() => {
    const gallery: Array<string | undefined> = [
      mainImageSource,
      ...(product.images ?? []).map((image: any) =>
        typeof image === "string" ? image : image?.url,
      ),
    ]

    return Array.from(new Set(gallery.filter(Boolean))) as string[]
  }, [mainImageSource, product.images])

  const { affiliateId } = useAffiliateTracking()

  const [showStickyBar, setShowStickyBar] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const triggerHeight = 480
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

  const githubUrl: string | undefined = product.github_repo_url || product.metadata?.github_repo_url

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
    productSlug: handle,
    affiliateId,
    showWaitlist: Boolean(product.coming_soon),
    onWaitlistClick: handleWaitlistClick,
    benefits,
    features: featureList,
    githubUrl,
  }), [
    product.title,
    product.name,
    product.description,
    product.coming_soon,
    displayPrice,
    originalPrice,
    priceLabel,
    handleWaitlistClick,
    handle,
    affiliateId,
    benefits,
    featureList,
    githubUrl,
  ])

  return (
    <>
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

      <div className="container mx-auto px-4 py-8">
        <HybridProductOverview
          breadcrumbItems={breadcrumbItems}
          productName={product.title || product.name}
          images={images}
          selectedImageIndex={selectedImageIndex}
          onSelectImage={setSelectedImageIndex}
          brandLogoPath={brandLogoPath}
          infoProps={infoSectionProps}
        />
      </div>
    </>
  )
}

export default EcommerceLayout
