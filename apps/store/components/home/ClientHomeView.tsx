/* eslint-disable react-hooks/rules-of-hooks */
"use client"

import { useCallback } from "react"
import Script from "next/script"
import NextLink from "next/link"

import { HomeTemplate } from "@repo/templates"
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Input } from "@repo/ui"
import { Footer as FooterComposite } from "@repo/ui/composites/Footer"
import { SiteNavbar } from "@repo/ui/composites/SiteNavbar"

import { useAffiliateTracking } from "@/components/product/useAffiliateTracking"
import type { BlogPostMeta } from "@/lib/blog"
import { productToHomeTemplate } from "@/lib/product-adapter"
import type { ProductData } from "@/lib/product-schema"
import type { SiteConfig } from "@/lib/site-config"

export type ClientHomeProps = {
  product: ProductData
  posts: BlogPostMeta[]
  siteConfig: SiteConfig
}

export function ClientHomeView({ product, posts, siteConfig }: ClientHomeProps) {
  const homeProps = productToHomeTemplate(product, posts)
  const { affiliateId, checkoutSuccess } = useAffiliateTracking()

  const showPosts = siteConfig.blog?.enabled !== false

  const BreadcrumbsSection = useCallback(() => (
    <nav aria-label="Breadcrumb" className="w-full bg-gray-50 dark:bg-gray-900 border-b">
      <div className="container mx-auto px-4">
        <ol className="flex items-center space-x-2 py-3 text-sm">
          <li>
            <NextLink
              href="/"
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
            >
              Home
            </NextLink>
          </li>
          <li className="text-gray-400 dark:text-gray-600">/</li>
          <li>
            <NextLink
              href="/#products"
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
            >
              Products
            </NextLink>
          </li>
          <li className="text-gray-400 dark:text-gray-600">/</li>
          <li className="text-gray-900 dark:text-gray-100 font-medium">{product.name}</li>
        </ol>
      </div>
    </nav>
  ), [product.name])

  const Navbar = useCallback(() => (
    <>
      <SiteNavbar
        site={{
          name: siteConfig.site?.name ?? "SERP Apps",
          categories: [],
          buyUrl: siteConfig.cta?.href ?? homeProps.ctaHref ?? product.purchase_url,
        }}
        Link={NextLink}
        showLinks={false}
        showCta={false}
      />
      <BreadcrumbsSection />
    </>
  ), [BreadcrumbsSection, siteConfig, homeProps, product])

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
        pricing={
          homeProps.pricing
            ? {
                ...homeProps.pricing,
                originalPrice: homeProps.pricing.originalPrice || "$27.99",
                priceNote: "Use the product on a single project",
                onCtaClick: () => {
                  const params = new URLSearchParams();
                  params.set("product", product.slug || "");
                  if (affiliateId) {
                    params.set("aff", affiliateId);
                  }
                  window.location.href = `/checkout?${params.toString()}`;
                },
                ctaLoading: false,
                ctaDisabled: false,
                ctaHref: `/checkout?product=${product.slug}${affiliateId ? `&aff=${affiliateId}` : ""}`,
                ctaText: "Get it Now!",
                ctaExtra: null,
              }
            : undefined
        }
      />
    </>
  )
}

export default ClientHomeView
