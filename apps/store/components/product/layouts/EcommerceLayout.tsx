"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { formatPrice } from "@/lib/products/products-data"
import { getBrandLogoPath } from "@/lib/products/brand-logos"
import { useAffiliateTracking } from "@/components/product/useAffiliateTracking"
import { StickyPurchaseBar } from "@/components/product/StickyPurchaseBar"
import { HybridProductOverview } from "@/components/product/hybrid/HybridProductOverview"
import type { ProductInfoSectionProps } from "@/components/product/ProductInfoSection"
import type { ProductBreadcrumbItem } from "@/components/product/ProductBreadcrumb"
import type { ExtendedProductData } from "@/components/product/types"
import { isPreRelease } from "@/lib/products/release-status"
import { GhlWaitlistModal } from "@/components/waitlist/GhlWaitlistModal"
import { productToHomeTemplate } from "@/lib/products/product-adapter"
import { useProductCheckoutCta } from "@/components/product/useProductCheckoutCta"

export interface EcommerceLayoutProps {
  product: ExtendedProductData
}

export function EcommerceLayout({ product }: EcommerceLayoutProps) {
  const variantPrice = product.variants?.[0]?.prices?.[0]
  const handle: string = product.handle || product.slug
  const brandLogoPath = getBrandLogoPath(handle)
  const mainImageSource = brandLogoPath ?? product.thumbnail ?? product.featured_image ?? undefined
  const waitlistEnabled = isPreRelease(product.status)

  const rawImages = useMemo(() => {
    const gallery: Array<string | undefined> = [
      mainImageSource,
      ...(product.images ?? []).map((image) =>
        typeof image === "string" ? image : image.url,
      ),
    ]

    return Array.from(new Set(gallery.filter(Boolean))) as string[]
  }, [mainImageSource, product.images])

  const images = useMemo(() => (waitlistEnabled ? [] : rawImages), [rawImages, waitlistEnabled])

  const homeProps = useMemo(() => productToHomeTemplate(product, []), [product])

  const { affiliateId } = useAffiliateTracking()

  const [showStickyBar, setShowStickyBar] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [showWaitlistModal, setShowWaitlistModal] = useState(false)
  const { cta: resolvedCta, handleCtaClick } = useProductCheckoutCta({
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

  const checkoutCta = waitlistEnabled ? null : resolvedCta
  const stickyImageSource = waitlistEnabled ? null : mainImageSource

  const handleHeroCheckoutClick = useCallback(() => {
    handleCtaClick("hero")
  }, [handleCtaClick])

  const handleStickyBarCheckoutClick = useCallback(() => {
    handleCtaClick("sticky_bar")
  }, [handleCtaClick])

  useEffect(() => {
    const handleScroll = () => {
      const triggerHeight = 480
      setShowStickyBar(window.scrollY > triggerHeight)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const displayPrice = variantPrice?.amount
    ? formatPrice(variantPrice.amount, variantPrice.currency_code ?? "USD")
    : product.pricing?.price ?? null

  const priceLabel = variantPrice?.label ?? product.pricing?.label ?? product.metadata?.price_label ?? null
  const originalPrice = variantPrice?.original_price ?? product.metadata?.original_price ?? null

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
    setShowWaitlistModal(true)
  }, [])

  const breadcrumbItems: ProductBreadcrumbItem[] = useMemo(() => (
    [
      { label: "Home", href: "/" },
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
    showWaitlist: waitlistEnabled,
    onWaitlistClick: handleWaitlistClick,
    benefits,
    features: featureList,
    githubUrl,
    checkoutCta,
    onCheckoutClick: handleHeroCheckoutClick,
  }), [
    product.title,
    product.name,
    product.description,
    waitlistEnabled,
    displayPrice,
    originalPrice,
    priceLabel,
    handleWaitlistClick,
    handle,
    affiliateId,
    benefits,
    featureList,
    githubUrl,
    checkoutCta,
    handleHeroCheckoutClick,
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
        mainImageSource={stickyImageSource}
        waitlistEnabled={waitlistEnabled}
        onWaitlistClick={handleWaitlistClick}
        checkoutCta={checkoutCta}
        onCheckoutClick={(event) => {
          event.preventDefault()
          handleStickyBarCheckoutClick()
        }}
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
          hideMedia={waitlistEnabled}
        />
      </div>

      <GhlWaitlistModal open={showWaitlistModal} onClose={() => setShowWaitlistModal(false)} />
    </>
  )
}


export default EcommerceLayout
