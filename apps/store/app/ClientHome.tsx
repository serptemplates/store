/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import NextLink from "next/link";
import Script from "next/script";
import { HomeTemplate } from "@repo/templates";
import type { ProductData } from "@/lib/product-schema";
import { productToHomeTemplate } from "@/lib/product-adapter";
import type { BlogPostMeta } from "@/lib/blog";
import type { SiteConfig } from "@/lib/site-config";
import { SiteNavbar } from "@repo/ui/composites/SiteNavbar";
import { Footer as FooterComposite } from "@repo/ui/composites/Footer";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Input } from "@repo/ui";
import { PayPalCheckoutButton } from "@/components/paypal-button";

export type ClientHomeProps = {
  product: ProductData;
  posts: BlogPostMeta[];
  siteConfig: SiteConfig;
};

export default function ClientHome({ product, posts, siteConfig }: ClientHomeProps) {
  const homeProps = productToHomeTemplate(product, posts);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const { affiliateId, checkoutStatus } = useMemo(() => {
    if (typeof window === "undefined") {
      return { affiliateId: undefined, checkoutStatus: undefined };
    }
    const params = new URLSearchParams(window.location.search);
    return {
      affiliateId: params.get("aff") ?? params.get("affiliate") ?? undefined,
      checkoutStatus: params.get("checkout") ?? undefined,
    };
  }, []);

  const isCheckoutSuccess = checkoutStatus === "success";

  useEffect(() => {
    if (!isCheckoutSuccess || typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("checkout");
    window.history.replaceState(null, "", url.toString());
  }, [isCheckoutSuccess]);

  const showPosts = siteConfig.blog?.enabled !== false;

  const handleCheckout = useCallback(async () => {
    if (isCheckoutLoading) {
      return;
    }

    // Use the local API endpoint for checkout
    const checkoutEndpoint = "/api/checkout/session";

    try {
      setIsCheckoutLoading(true);

      const response = await fetch(checkoutEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offerId: product.slug,
          affiliateId,
          metadata: {
            landerId: product.slug,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create checkout session (${response.status})`);
      }

      const payload = (await response.json()) as { url?: string };

      if (payload?.url) {
        window.open(payload.url, "_blank", "noopener,noreferrer");
        return;
      }

      throw new Error("Checkout session missing redirect URL");
    } catch (error) {
      console.error("[checkout] redirect failed", error);
      window.open(siteConfig.cta?.href ?? product.purchase_url, "_blank", "noopener,noreferrer");
    } finally {
      setIsCheckoutLoading(false);
    }
  }, [affiliateId, isCheckoutLoading, product.purchase_url, product.slug, siteConfig.cta?.href]);

  const Navbar = useCallback(
    () => (
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
    ),
    [handleCheckout, isCheckoutLoading, siteConfig, product, homeProps]
  );

  const Footer = useCallback(() => <FooterComposite />, []);

  // Breadcrumb structured data for SEO
  const siteUrl = siteConfig.site?.domain ? `https://${siteConfig.site.domain}` : 'https://store.serp.co';
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": `${siteUrl}/`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Products",
        "item": `${siteUrl}/#products`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": product.name,
        "item": `${siteUrl}/${product.slug}`
      }
    ]
  };

  // Create a custom component for breadcrumbs that will be injected after the navbar
  const BreadcrumbsSection = () => (
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
          <li className="text-gray-900 dark:text-gray-100 font-medium">
            {product.name}
          </li>
        </ol>
      </div>
    </nav>
  );

  return (
    <>
      {/* Breadcrumb Schema */}
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />

      {isCheckoutSuccess && (
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
        pricing={homeProps.pricing
          ? {
              ...homeProps.pricing,
              onCtaClick: handleCheckout,
              ctaLoading: isCheckoutLoading,
              ctaDisabled: isCheckoutLoading,
              ctaHref: siteConfig.cta?.href ?? homeProps.pricing.ctaHref ?? homeProps.ctaHref,
              ctaText: siteConfig.cta?.text ?? homeProps.pricing.ctaText ?? homeProps.ctaText ?? "Pay with Stripe",
              // Add custom content after the CTA button
              ctaExtra: (
                <PayPalCheckoutButton
                  offerId={product.slug}
                  price={homeProps.pricing?.price || product.pricing?.price || "$99"}
                  affiliateId={affiliateId}
                  metadata={{
                    landerId: product.slug,
                  }}
                  buttonText="Pay with PayPal"
                  className="w-full"
                />
              ),
            }
          : undefined}
      />
    </>
  );
}
