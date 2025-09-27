"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ProductData } from "@/lib/product-schema";
import type { SiteConfig } from "@/lib/site-config";
import { getBrandLogoPath } from "@/lib/brand-logos";

interface AppleStyleHeroProps {
  product: ProductData;
  siteConfig: SiteConfig;
  onCheckout: () => void;
  isCheckoutLoading: boolean;
}

export default function AppleStyleHero({
  product,
  siteConfig,
  onCheckout,
  isCheckoutLoading
}: AppleStyleHeroProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const price = product.pricing;
  const handle = product.slug;
  const brandLogoPath = getBrandLogoPath(handle);
  const mainImageSource = brandLogoPath || product.featured_image;

  const allImages = [
    mainImageSource,
    ...(product.screenshots || []).map((s) => s.url)
  ].filter(Boolean);

  // Apple-style image zoom on hover
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x, y });
  };

  return (
    <section className="min-h-screen bg-white">
      {/* Apple-style minimal navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md z-50 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="font-medium text-gray-900">
              {siteConfig.site?.name || "Store"}
            </Link>

            {/* Sticky Buy Button - Apple style */}
            <div className="flex items-center gap-4">
              {price && (
                <span className="text-sm font-medium text-gray-900">
                  From {price.price}
                </span>
              )}
              <button
                onClick={onCheckout}
                disabled={isCheckoutLoading}
                className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                Buy
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Hero Content */}
      <div className="pt-14">
        {/* Product Title Section - Apple style */}
        <div className="text-center py-12 px-4">
          <h1 className="text-5xl lg:text-6xl font-semibold text-gray-900 tracking-tight">
            {product.name}
          </h1>
          <p className="mt-4 text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto">
            {product.tagline}
          </p>
        </div>

        {/* Image Gallery - Apple style with zoom */}
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Main Image with Zoom */}
            <div className="sticky top-24">
              <div
                className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 cursor-zoom-in"
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsImageZoomed(true)}
                onMouseLeave={() => setIsImageZoomed(false)}
              >
                {allImages[selectedImageIndex] ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={allImages[selectedImageIndex]}
                      alt={product.name}
                      fill
                      className={`${brandLogoPath && selectedImageIndex === 0 ? 'object-contain p-16' : 'object-cover'}
                        transition-transform duration-200 ${isImageZoomed ? 'scale-150' : 'scale-100'}`}
                      style={isImageZoomed ? {
                        transformOrigin: `${mousePosition.x}% ${mousePosition.y}%`
                      } : {}}
                      priority
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Image Selector - Apple style dots */}
              {allImages.length > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  {allImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        selectedImageIndex === index
                          ? 'bg-gray-900 w-8'
                          : 'bg-gray-400 hover:bg-gray-600'
                      }`}
                      aria-label={`View image ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Product Info - Apple style */}
            <div className="lg:pt-12">
              {/* Key Features - Nike style icons */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="text-center p-4 border border-gray-200 rounded-xl">
                  <svg className="w-8 h-8 mx-auto mb-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <p className="text-sm font-medium">Instant Access</p>
                </div>
                <div className="text-center p-4 border border-gray-200 rounded-xl">
                  <svg className="w-8 h-8 mx-auto mb-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <p className="text-sm font-medium">Lifetime Updates</p>
                </div>
                <div className="text-center p-4 border border-gray-200 rounded-xl">
                  <svg className="w-8 h-8 mx-auto mb-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium">24/7 Support</p>
                </div>
                <div className="text-center p-4 border border-gray-200 rounded-xl">
                  <svg className="w-8 h-8 mx-auto mb-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-sm font-medium">All Platforms</p>
                </div>
              </div>

              {/* Price Section - Apple style */}
              {price && (
                <div className="mb-8">
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-semibold text-gray-900">
                      {price.price}
                    </span>
                    {price.original_price && (
                      <span className="text-xl text-gray-500 line-through">
                        {price.original_price}
                      </span>
                    )}
                  </div>
                  {price.note && (
                    <p className="text-sm text-orange-600 mt-2">
                      {price.note}
                    </p>
                  )}
                </div>
              )}

              {/* CTA Buttons - Apple style */}
              <div className="space-y-3 mb-8">
                <button
                  onClick={onCheckout}
                  disabled={isCheckoutLoading}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-medium text-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isCheckoutLoading ? "Processing..." : (price?.cta_text || "Buy Now")}
                </button>

                {/* Secondary Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <button className="py-3 border border-gray-300 rounded-2xl font-medium text-gray-700 hover:bg-gray-50 transition">
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      Save
                    </span>
                  </button>
                  <button className="py-3 border border-gray-300 rounded-2xl font-medium text-gray-700 hover:bg-gray-50 transition">
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a9.001 9.001 0 01-7.432 0m9.032-4.026A9.001 9.001 0 0112 3c-4.474 0-8.268 3.12-9.032 7.326m0 4.026A9.001 9.001 0 0112 21c4.474 0 8.268-3.12 9.032-7.326" />
                      </svg>
                      Share
                    </span>
                  </button>
                </div>
              </div>

              {/* Description - Apple style minimal */}
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-600 leading-relaxed">
                  {product.description && product.description.length > 200
                    ? product.description.slice(0, 200).trim() + '...'
                    : product.description}
                </p>
              </div>

              {/* Key Benefits - Clean list */}
              {product.features && product.features.length > 0 && (
                <div className="mt-8 space-y-3">
                  {product.features.slice(0, 4).map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}