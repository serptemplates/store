"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ProductData } from "@/lib/products/product-schema";
import type { SiteConfig } from "@/lib/site-config";
import { getBrandLogoPath } from "@/lib/products/brand-logos";

interface NikeStyleHeroProps {
  product: ProductData;
  siteConfig: SiteConfig;
  onCheckout: () => void;
  isCheckoutLoading: boolean;
}

export default function NikeStyleHero({
  product,
  siteConfig,
  onCheckout,
  isCheckoutLoading
}: NikeStyleHeroProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const price = product.pricing;
  const handle = product.slug;
  const brandLogoPath = getBrandLogoPath(handle);
  const mainImageSource = brandLogoPath || product.featured_image;

  const allImages = [
    mainImageSource,
    ...(product.screenshots || []).map((s) => s.url)
  ].filter(Boolean);

  // Mock data for "How Others Are Using It" - in real app, this would come from API
  const userContent = [
    { id: 1, user: "@techguru", image: "/user-1.jpg", caption: "Game changer for my workflow!" },
    { id: 2, user: "@creative_pro", image: "/user-2.jpg", caption: "Can't work without it now" },
    { id: 3, user: "@startup_founder", image: "/user-3.jpg", caption: "Saved me thousands of dollars" },
    { id: 4, user: "@developer", image: "/user-4.jpg", caption: "Best investment this year" },
  ];

  return (
    <section className="min-h-screen bg-white">
      {/* Nike-style navbar */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-2xl font-bold">
              {siteConfig.site?.name || "Store"}
            </Link>

            <div className="flex items-center gap-6">
              <button className="text-gray-600 hover:text-black transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button className="text-gray-600 hover:text-black transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              <button className="text-gray-600 hover:text-black transition relative">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  1
                </span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Product Section - Nike Style */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {/* Left: Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden">
              {allImages[selectedImageIndex] ? (
                <Image
                  src={allImages[selectedImageIndex]}
                  alt={product.name}
                  fill
                  className={`${brandLogoPath && selectedImageIndex === 0 ? 'object-contain p-12' : 'object-cover'}`}
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

            {/* Thumbnail Grid - Nike style 2x2 */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-2 gap-4">
                {allImages.slice(0, 4).map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative aspect-square bg-gray-50 rounded-lg overflow-hidden border-2 transition ${
                      selectedImageIndex === index ? 'border-black' : 'border-transparent hover:border-gray-300'
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

          {/* Right: Product Info - Nike Style */}
          <div className="lg:px-8">
            {/* Category */}
            <p className="text-orange-600 font-medium mb-2">
              {product.categories?.[0] || "Digital Product"}
            </p>

            {/* Title */}
            <h1 className="text-4xl font-bold mb-2">{product.name}</h1>

            {/* Tagline */}
            <p className="text-gray-600 mb-6">{product.tagline}</p>

            {/* Price */}
            {price && (
              <div className="mb-8">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-medium">{price.price}</span>
                  {price.original_price && (
                    <span className="text-xl text-gray-500 line-through">
                      {price.original_price}
                    </span>
                  )}
                  {price.original_price && (
                    <span className="bg-red-500 text-white px-2 py-1 text-sm rounded">
                      {Math.round(((parseFloat(price.original_price.replace('$', '')) -
                        parseFloat((price.price || '$0').replace('$', ''))) /
                        parseFloat(price.original_price.replace('$', ''))) * 100)}% OFF
                    </span>
                  )}
                </div>
                {price.note && (
                  <p className="text-orange-600 text-sm mt-2 font-medium">
                    {price.note}
                  </p>
                )}
              </div>
            )}

            {/* Select Options (if applicable) */}
            <div className="mb-8">
              <h3 className="font-medium mb-4">Select Package</h3>
              <div className="grid grid-cols-3 gap-3">
                {['Starter', 'Professional', 'Enterprise'].map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`py-3 px-4 border rounded-lg font-medium transition ${
                      selectedSize === size
                        ? 'border-black bg-black text-white'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Add to Cart Buttons - Nike Style */}
            <div className="space-y-3 mb-8">
              <button
                onClick={onCheckout}
                disabled={isCheckoutLoading}
                className="w-full bg-black text-white py-4 rounded-full font-medium hover:bg-gray-900 transition disabled:opacity-50"
              >
                {isCheckoutLoading ? "Processing..." : "Add to Bag"}
              </button>

              <button className="w-full border border-gray-300 py-4 rounded-full font-medium hover:border-gray-400 transition flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Favorite
              </button>
            </div>

            {/* Shipping & Returns - Nike Style */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <div>
                  <p className="font-medium">Free Delivery</p>
                  <p className="text-sm text-gray-600">Instant download after purchase</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                <div>
                  <p className="font-medium">Free Returns</p>
                  <p className="text-sm text-gray-600">30-day money back guarantee</p>
                </div>
              </div>
            </div>

            {/* Product Details Accordion - Nike Style */}
            <div className="border-t pt-6">
              <details className="group">
                <summary className="flex justify-between items-center cursor-pointer py-4">
                  <span className="font-medium">Description</span>
                  <svg className="w-5 h-5 transition group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="text-gray-600 pb-4">
                  {product.description}
                </p>
              </details>

              {product.features && product.features.length > 0 && (
                <details className="group border-t">
                  <summary className="flex justify-between items-center cursor-pointer py-4">
                    <span className="font-medium">Features & Benefits</span>
                    <svg className="w-5 h-5 transition group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <ul className="space-y-2 pb-4">
                    {product.features.slice(0, 6).map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-gray-600">
                        <span className="text-green-500 mt-1">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <details className="group border-t">
                <summary className="flex justify-between items-center cursor-pointer py-4">
                  <span className="font-medium">Shipping & Returns</span>
                  <svg className="w-5 h-5 transition group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="text-gray-600 pb-4 space-y-2">
                  <p>• Instant digital delivery</p>
                  <p>• 30-day money-back guarantee</p>
                  <p>• Lifetime updates included</p>
                  <p>• 24/7 customer support</p>
                </div>
              </details>
            </div>
          </div>
        </div>

        {/* "How Others Are Using It" Section - Nike Style */}
        <div className="border-t pt-12">
          <h2 className="text-2xl font-bold mb-8">How Others Are Using It</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {userContent.map((item) => (
              <div key={item.id} className="group cursor-pointer">
                <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white opacity-0 group-hover:opacity-100 transition">
                    <p className="font-medium text-sm">{item.user}</p>
                    <p className="text-xs">{item.caption}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Complete the Look / Bundle Section */}
        <div className="border-t pt-12 mt-12">
          <h2 className="text-2xl font-bold mb-8">Complete Your Setup</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['Premium Templates Pack', 'Advanced Training Course', 'Priority Support'].map((item, index) => (
              <div key={index} className="border rounded-lg p-4 hover:shadow-lg transition">
                <div className="aspect-square bg-gray-100 rounded-lg mb-4"></div>
                <h3 className="font-medium mb-2">{item}</h3>
                <p className="text-gray-600 text-sm mb-3">Perfect addition to enhance your experience</p>
                <button className="text-sm font-medium underline">Add to Bundle</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}