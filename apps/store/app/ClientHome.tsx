/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import NextLink from "next/link";
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

    const checkoutEndpoint = process.env.NEXT_PUBLIC_CHECKOUT_URL;

    try {
      setIsCheckoutLoading(true);

      if (!checkoutEndpoint) {
        window.open(siteConfig.cta?.href ?? product.purchase_url, "_blank", "noopener,noreferrer");
        return;
      }

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
      <SiteNavbar
        site={{
          name: siteConfig.site?.name ?? "SERP Apps",
          categories: [],
          buyUrl: siteConfig.cta?.href ?? homeProps.ctaHref ?? product.purchase_url,
        }}
        Link={NextLink}
        ctaText={siteConfig.cta?.text ?? homeProps.ctaText ?? "Checkout"}
        ctaHref={siteConfig.cta?.href ?? homeProps.ctaHref ?? product.purchase_url}
        onCtaClick={handleCheckout}
        ctaDisabled={isCheckoutLoading}
        blogHref="/blog"
        showLinks={true}
      />
    ),
    [handleCheckout, isCheckoutLoading, siteConfig, product, homeProps]
  );

  const Footer = useCallback(() => <FooterComposite />, []);

  return (
    <>
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
              ctaText: siteConfig.cta?.text ?? homeProps.pricing.ctaText ?? homeProps.ctaText ?? "Get Instant Access",
            }
          : undefined}
      />
    </>
  );
}
