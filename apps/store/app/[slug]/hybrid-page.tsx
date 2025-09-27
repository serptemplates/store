"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  TestimonialsSection,
  FaqSection,
  PricingCta,
  PostsSection,
  FeaturesSection
} from "@repo/templates";
import type { ProductData } from "@/lib/product-schema";
import { productToHomeTemplate } from "@/lib/product-adapter";
import type { BlogPostMeta } from "@/lib/blog";
import type { SiteConfig } from "@/lib/site-config";
import { getBrandLogoPath } from "@/lib/brand-logos";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from "@repo/ui";
import { Footer as FooterComposite } from "@repo/ui/composites/Footer";

export type HybridPageProps = {
  product: ProductData;
  posts: BlogPostMeta[];
  siteConfig: SiteConfig;
};

export default function HybridPage({ product, posts, siteConfig }: HybridPageProps) {
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const homeProps = productToHomeTemplate(product, posts);

  const price = product.pricing;
  const handle = product.slug;
  const brandLogoPath = getBrandLogoPath(handle);
  const mainImageSource = brandLogoPath || product.featured_image;

  const allImages = [
    mainImageSource,
    ...(product.screenshots || []).map((s) => s.url)
  ].filter(Boolean);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const triggerHeight = 600;
      setShowStickyBar(scrollPosition > triggerHeight);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCheckout = useCallback(async () => {
    if (isCheckoutLoading) return;

    const checkoutEndpoint = process.env.NEXT_PUBLIC_CHECKOUT_URL;

    try {
      setIsCheckoutLoading(true);

      if (!checkoutEndpoint) {
        window.open(siteConfig.cta?.href ?? product.purchase_url, "_blank", "noopener,noreferrer");
        return;
      }

      const response = await fetch(checkoutEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: product.slug,
          metadata: { landerId: product.slug },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create checkout session (${response.status})`);
      }

      const payload = await response.json() as { url?: string };

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

  const Footer = useCallback(() => <FooterComposite />, []);

  return (
    <>
      {/* Site Header/Navbar */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-xl font-bold">
              {siteConfig.site?.name || "Store"}
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-gray-600 hover:text-gray-900">Home</Link>
              <Link href="/shop" className="text-gray-600 hover:text-gray-900">Shop</Link>
              <Link href="/blog" className="text-gray-600 hover:text-gray-900">Blog</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Sticky Buy Bar */}
      <div className={`fixed top-0 left-0 right-0 bg-white border-b shadow-lg z-50 transition-transform duration-300 ${
        showStickyBar ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Mini Product Info */}
            <div className="flex items-center gap-3">
              {mainImageSource && (
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  <Image
                    src={mainImageSource}
                    alt={product.name}
                    fill
                    className={`${brandLogoPath ? 'object-contain p-1' : 'object-cover'}`}
                    unoptimized
                  />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-sm line-clamp-1">{product.name}</h3>
                {price && (
                  <p className="text-lg font-bold text-green-600">
                    {price.price}
                    {price.original_price && (
                      <span className="ml-2 text-sm text-gray-500 line-through">
                        {price.original_price}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Sticky Actions */}
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              <button
                onClick={handleCheckout}
                disabled={isCheckoutLoading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {isCheckoutLoading ? "Processing..." : "Buy Now"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Ecommerce Hero Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Product Images */}
          <div>
            <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 mb-4">
              {allImages[selectedImageIndex] ? (
                <Image
                  src={allImages[selectedImageIndex]}
                  alt={product.name}
                  fill
                  className={`${brandLogoPath && selectedImageIndex === 0 ? 'object-contain p-8' : 'object-cover'}`}
                  priority
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Image Gallery */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {allImages.slice(0, 4).map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 transition ${
                      selectedImageIndex === index ? 'border-blue-500' : 'border-transparent'
                    }`}
                  >
                    {image && (
                      <Image
                        src={image}
                        alt={`View ${index + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            {/* Breadcrumb */}
            <nav className="text-sm mb-4">
              <Link href="/" className="text-gray-500 hover:text-gray-700">Home</Link>
              <span className="mx-2 text-gray-400">/</span>
              <Link href="/shop" className="text-gray-500 hover:text-gray-700">Shop</Link>
              <span className="mx-2 text-gray-400">/</span>
              <span className="text-gray-900">{product.name}</span>
            </nav>

            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>

            <p className="text-gray-600 mb-4">
              {product.description && product.description.length > 300
                ? product.description.slice(0, 300).trim() + '...'
                : product.description}
            </p>

            {/* Price */}
            {price && (
              <div className="mb-6">
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold text-gray-900">
                    {price.price}
                  </span>
                  {price.original_price && (
                    <>
                      <span className="text-2xl text-gray-400 line-through">
                        {price.original_price}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        {Math.round(((parseFloat(price.original_price.replace('$', '')) -
                          parseFloat((price.price || '$0').replace('$', ''))) /
                          parseFloat(price.original_price.replace('$', ''))) * 100)}% OFF
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Quick Features */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-sm">Lifetime Updates</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-sm">Instant Download</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="text-sm">24/7 Support</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-4 mb-8">
              <button
                onClick={handleCheckout}
                disabled={isCheckoutLoading}
                className="flex-1 bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isCheckoutLoading ? "Processing..." : (price?.cta_text || "Get Instant Access")}
              </button>
              <button className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Videos Section if available */}
      {product.product_videos && product.product_videos.length > 0 && (
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
              <iframe
                key={selectedVideoIndex}
                src={product.product_videos[selectedVideoIndex]
                  .replace('watch?v=', 'embed/')
                  .replace('vimeo.com/', 'player.vimeo.com/video/')
                  .replace('youtu.be/', 'youtube.com/embed/')}
                className="absolute inset-0 w-full h-full"
                allowFullScreen
                title={`Product Demo Video ${selectedVideoIndex + 1}`}
              />
            </div>

            {/* Video Progress Indicators */}
            {product.product_videos.length > 1 && (
              <div className="flex items-center gap-2 mt-4 justify-center">
                {product.product_videos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedVideoIndex(index)}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      selectedVideoIndex === index
                        ? 'w-8 bg-blue-600'
                        : 'w-2 bg-gray-300 hover:bg-gray-400'
                    }`}
                    aria-label={`Go to video ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Landing Page Components - Modular Sections */}
      <div className="mt-20">
        {/* Features Section - if we have feature data */}
        {product.features && product.features.length > 0 && (
          <FeaturesSection
            features={product.features.map((feature) => ({
              title: feature,
              description: "",
              icon: null
            }))}
          />
        )}

        {/* Testimonials Section */}
        {homeProps.testimonials && homeProps.testimonials.length > 0 && (
          <TestimonialsSection
            testimonials={homeProps.testimonials}
          />
        )}

        {/* FAQ Section */}
        {homeProps.faqs && homeProps.faqs.length > 0 && (
          <FaqSection
            faqs={homeProps.faqs}
          />
        )}

        {/* Blog Posts Section */}
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

        {/* Pricing Section */}
        {homeProps.pricing && (
          <PricingCta
            {...homeProps.pricing}
            onCtaClick={handleCheckout}
            ctaLoading={isCheckoutLoading}
            ctaDisabled={isCheckoutLoading}
          />
        )}

        {/* Footer */}
        <Footer />
      </div>
    </>
  );
}