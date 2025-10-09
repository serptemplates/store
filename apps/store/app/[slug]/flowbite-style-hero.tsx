"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ProductData } from "@/lib/products/product-schema";
import type { SiteConfig } from "@/lib/site-config";
import { getBrandLogoPath } from "@/lib/products/brand-logos";

interface FlowbiteStyleHeroProps {
  product: ProductData;
  siteConfig: SiteConfig;
  onCheckout: () => void;
  isCheckoutLoading: boolean;
}

export default function FlowbiteStyleHero({
  product,
  siteConfig,
  onCheckout,
  isCheckoutLoading
}: FlowbiteStyleHeroProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll for sticky bar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const price = product.pricing;
  const handle = product.slug;
  const brandLogoPath = getBrandLogoPath(handle);
  const mainImageSource = brandLogoPath || product.featured_image;

  const allImages = [
    mainImageSource,
    ...(product.screenshots || []).map((s) => s.url)
  ].filter(Boolean);

  // Calculate average rating (mock for now, could come from reviews)
  const avgRating = 5.0;
  const reviewCount = product.reviews?.length || 0;

  return (
    <>
      {/* Sticky Buy Bar - Apple style */}
      <nav className={`fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md z-50 border-b border-gray-200 transition-transform duration-300 ${
        isScrolled ? 'translate-y-0' : '-translate-y-full'
      }`}>
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

      <section className="py-8 bg-white md:py-16">
        <div className="max-w-screen-xl px-4 mx-auto 2xl:px-0">
        <div className="lg:grid lg:grid-cols-2 lg:gap-8 xl:gap-16">
          {/* Left: Image Gallery */}
          <div className="shrink-0 max-w-md lg:max-w-lg mx-auto">
            <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-50 mb-4">
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {allImages.slice(0, 4).map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative aspect-square bg-gray-50 rounded-lg overflow-hidden border-2 transition ${
                      selectedImageIndex === index ? 'border-blue-600' : 'border-gray-200 hover:border-gray-300'
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

          {/* Right: Product Info */}
          <div className="mt-6 sm:mt-8 lg:mt-0">
            <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
              {product.name}
            </h1>

            <div className="mt-4 sm:items-center sm:gap-4 sm:flex">
              {price && (
                <p className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
                  {price.price}
                  {price.original_price && (
                    <span className="ml-3 text-lg font-normal text-gray-500 line-through">
                      {price.original_price}
                    </span>
                  )}
                </p>
              )}

              {/* Rating Stars */}
              {reviewCount > 0 && (
                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 ${i < Math.floor(avgRating) ? 'text-yellow-400' : 'text-gray-300'}`}
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M13.849 4.22c-.684-1.626-3.014-1.626-3.698 0L8.397 8.387l-4.552.361c-1.775.14-2.495 2.331-1.142 3.477l3.468 2.937-1.06 4.392c-.413 1.713 1.472 3.067 2.992 2.149L12 19.35l3.897 2.354c1.52.918 3.405-.436 2.992-2.15l-1.06-4.39 3.468-2.938c1.353-1.146.633-3.336-1.142-3.477l-4.552-.36-1.754-4.17Z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-sm font-medium leading-none text-gray-500">
                    ({avgRating.toFixed(1)})
                  </p>
                  <a
                    href="#reviews"
                    className="text-sm font-medium leading-none text-gray-900 underline hover:no-underline"
                  >
                    {reviewCount} Reviews
                  </a>
                </div>
              )}
            </div>

            {/* CTA Buttons */}
            <div className="mt-6 sm:gap-4 sm:items-center sm:flex sm:mt-8">
              <button
                className="flex items-center justify-center py-2.5 px-5 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100"
              >
                <svg
                  className="w-5 h-5 -ms-2 me-2"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12.01 6.001C6.5 1 1 8 5.782 13.001L12.011 20l6.23-7C23 8 17.5 1 12.01 6.002Z"
                  />
                </svg>
                Add to favorites
              </button>

              <button
                onClick={onCheckout}
                disabled={isCheckoutLoading}
                className="text-white mt-4 sm:mt-0 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 focus:outline-none flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  className="w-5 h-5 -ms-2 me-2"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4h1.5L8 16m0 0h8m-8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm.75-3H7.5M11 7H6.312M17 4v6m-3-3h6"
                  />
                </svg>
                {isCheckoutLoading ? "Processing..." : "Add to cart"}
              </button>
            </div>

            <hr className="my-6 md:my-8 border-gray-200" />

            {/* Product Description */}
            <p className="mb-6 text-gray-500">
              {product.tagline}
            </p>

            <p className="text-gray-500">
              {product.description && product.description.length > 300
                ? product.description.slice(0, 300).trim() + '...'
                : product.description}
            </p>

            {/* Feature List */}
            {product.features && product.features.length > 0 && (
              <div className="mt-8">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Key Features</h3>
                <ul className="space-y-2">
                  {product.features.slice(0, 5).map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-600">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Trust Badges */}
            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <p className="text-xs text-gray-500">Secure Payment</p>
              </div>
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <p className="text-xs text-gray-500">Instant Access</p>
              </div>
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                <p className="text-xs text-gray-500">30-Day Guarantee</p>
              </div>
            </div>

            {/* Additional Info */}
            {price?.note && (
              <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800 font-medium">
                  {price.note}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
    </>
  );
}