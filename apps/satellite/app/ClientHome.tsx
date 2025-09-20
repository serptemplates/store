"use client";

import { useCallback, useState } from "react";
import NextLink from "next/link";
import { HomeTemplate } from "@repo/templates";
import type { ProductData } from "@/lib/product-schema";
import { productToHomeTemplate } from "@/lib/product-adapter";
import type { BlogPostMeta } from "@/lib/blog";
import type { SiteConfig } from "@/lib/site-config";
import { SiteNavbar } from "@repo/ui/composites/SiteNavbar";
import { Footer as FooterComposite } from "@repo/ui/composites/Footer";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Input } from "@repo/ui";

export type ClientHomeProps = {
  product: ProductData;
  posts: BlogPostMeta[];
  siteConfig: SiteConfig;
};

export default function ClientHome({ product, posts, siteConfig }: ClientHomeProps) {
  const homeProps = productToHomeTemplate(product, posts);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const breadcrumbs = [
    {
      label: siteConfig.site?.name ?? "SERP Apps",
      href: "/",
    },
    {
      label: product.name,
    },
  ];

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
  }, [isCheckoutLoading, product.purchase_url, product.slug, siteConfig.cta?.href]);

  const Navbar = () => (
    <SiteNavbar
      site={{
        name: siteConfig.site?.name ?? product.name,
        categories: product.categories,
        buyUrl: siteConfig.cta?.href ?? homeProps.ctaHref ?? product.purchase_url,
      }}
      Link={NextLink}
      ctaText={siteConfig.cta?.text ?? homeProps.ctaText ?? "Checkout"}
      ctaHref={siteConfig.cta?.href ?? homeProps.ctaHref ?? product.purchase_url}
      onCtaClick={handleCheckout}
      ctaDisabled={isCheckoutLoading}
      blogHref="/blog"
      showLinks={false}
      showCta
    />
  );

  const Footer = () => <FooterComposite />;

  return (
    <HomeTemplate
      ui={{ Navbar, Footer, Button, Card, CardHeader, CardTitle, CardContent, Badge, Input }}
      breadcrumbs={breadcrumbs}
      {...homeProps}
      ctaText={siteConfig.cta?.text ?? homeProps.ctaText}
      ctaHref={siteConfig.cta?.href ?? homeProps.ctaHref}
      pricing={homeProps.pricing
        ? {
            ...homeProps.pricing,
            onCtaClick: handleCheckout,
            ctaLoading: isCheckoutLoading,
            ctaDisabled: isCheckoutLoading,
            ctaHref: siteConfig.cta?.href ?? homeProps.pricing.ctaHref ?? homeProps.ctaHref,
            ctaText: siteConfig.cta?.text ?? homeProps.pricing.ctaText ?? homeProps.ctaText,
          }
        : undefined}
    />
  );
}
