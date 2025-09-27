"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import type { Route } from "next"
import { getBrandLogoPath } from "@/lib/brand-logos"

// Format price helper (client-safe)
function formatPrice(amount: number | string, currency: string = 'USD'): string {
  // Handle string prices like "$79" or "79"
  if (typeof amount === 'string') {
    const cleanAmount = amount.replace(/[^0-9.]/g, '')
    return `$${cleanAmount}`
  }
  // Handle numeric prices (assuming cents)
  const numAmount = typeof amount === 'number' ? amount / 100 : parseFloat(amount) / 100
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(numAmount)
}

const SHOP_ROUTE = "/shop" satisfies Route

export default function HybridEcommerceLayout({ product }: { product: any }) {
  const [showStickyBar, setShowStickyBar] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  const price = product.variants?.[0]?.prices?.[0] || product.pricing
  const handle = product.handle || product.slug
  const brandLogoPath = getBrandLogoPath(handle)
  const mainImageSource = brandLogoPath || product.thumbnail || product.featured_image

  const allImages = [
    mainImageSource,
    ...(product.screenshots || []).map((s: any) => s.url)
  ].filter(Boolean)

  useEffect(() => {
    const handleScroll = () => {
      // Show sticky bar after scrolling past the main product section
      const scrollPosition = window.scrollY
      const triggerHeight = 600 // Adjust based on your needs
      setShowStickyBar(scrollPosition > triggerHeight)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
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
                    alt={product.title || product.name}
                    fill
                    className={`${brandLogoPath ? 'object-contain p-1' : 'object-cover'}`}
                    unoptimized
                  />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-sm line-clamp-1">{product.title || product.name}</h3>
                {price && (
                  <p className="text-lg font-bold text-green-600">
                    {price.amount ? formatPrice(price.amount, price.currency_code || 'USD') : (price.price || '$79')}
                    {(product.metadata?.original_price || price.original_price) && (
                      <span className="ml-2 text-sm text-gray-500 line-through">
                        {product.metadata?.original_price || price.original_price}
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
              <a
                href={product.stripe?.price_id
                  ? `/api/checkout?price_id=${product.stripe.price_id}`
                  : product.purchase_url || "#"}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Buy Now
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm mb-6">
          <ol className="flex items-center space-x-2 text-gray-500">
            <li><Link href={SHOP_ROUTE} className="hover:text-gray-700">Shop</Link></li>
            <li>/</li>
            <li className="text-gray-900 font-medium">{product.title || product.name}</li>
          </ol>
        </nav>

        {/* E-commerce Style Product Section */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 mb-20">
          {/* Product Images Gallery */}
          <div>
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 mb-4">
              {allImages[selectedImageIndex] ? (
                <Image
                  src={allImages[selectedImageIndex]}
                  alt={product.title || product.name}
                  fill
                  className={`${brandLogoPath && selectedImageIndex === 0 ? 'object-contain p-12' : 'object-cover'}`}
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-6 gap-2">
                {allImages.slice(0, 6).map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 transition ${
                      selectedImageIndex === index ? 'border-blue-500' : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    {image && (
                      <Image
                        src={image}
                        alt={`${product.title || product.name} ${index + 1}`}
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
            <h1 className="text-4xl font-bold text-gray-900 mb-3">{product.title || product.name}</h1>
            <p className="text-xl text-gray-600 mb-6">{product.tagline}</p>

            {/* Price Section */}
            {price && (
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <div className="flex items-baseline gap-3">
                  <p className="text-4xl font-bold text-gray-900">
                    {price.amount ? formatPrice(price.amount, price.currency_code) : price.price}
                  </p>
                  {(product.metadata?.original_price || price.original_price) && (
                    <>
                      <p className="text-xl text-gray-500 line-through">
                        {product.metadata?.original_price || price.original_price}
                      </p>
                      <span className="bg-red-500 text-white text-sm px-2 py-1 rounded-md font-semibold">
                        SAVE {Math.round(((parseFloat((product.metadata?.original_price || price.original_price).replace('$', '')) -
                          parseFloat((price.price || price.amount).toString().replace('$', ''))) /
                          parseFloat((product.metadata?.original_price || price.original_price).replace('$', ''))) * 100)}%
                      </span>
                    </>
                  )}
                </div>
                {price.note && (
                  <p className="text-sm text-orange-600 mt-2 font-medium">⚡ {price.note}</p>
                )}
              </div>
            )}

            <div className="prose prose-gray mb-8 text-gray-600">
              <p>{product.description || "No description available."}</p>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-4 mb-8">
              <a
                href={product.stripe?.price_id
                  ? `/api/checkout?price_id=${product.stripe.price_id}`
                  : product.purchase_url || "#"}
                className="flex-1 bg-blue-600 text-white text-center py-4 px-8 rounded-xl font-semibold hover:bg-blue-700 transition transform hover:scale-[1.02] shadow-lg"
              >
                {product.pricing?.cta_text || "Get Instant Access"}
              </a>
              <button className="p-4 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              <button className="p-4 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a9.001 9.001 0 01-7.432 0m9.032-4.026A9.001 9.001 0 0112 3c-4.474 0-8.268 3.12-9.032 7.326m0 4.026A9.001 9.001 0 0112 21c4.474 0 8.268-3.12 9.032-7.326" />
                </svg>
              </button>
            </div>

            {/* Trust Badges */}
            <div className="border-t border-b py-6 mb-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Secure Payment</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Instant Access</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Money Back</span>
                </div>
              </div>
            </div>

            {/* Quick Features */}
            {product.features && product.features.length > 0 && (
              <div className="space-y-3">
                {product.features.slice(0, 5).map((feature: string, index: number) => (
                  <div key={index} className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Landing Page Style Content Below */}
        <div className="max-w-6xl mx-auto">

          {/* Social Proof Section */}
          {product.reviews && product.reviews.length > 0 && (
            <section className="mb-20">
              <h2 className="text-3xl font-bold text-center mb-12">What Our Customers Say</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {product.reviews.map((review: any, index: number) => (
                  <div key={index} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                    <div className="flex items-center mb-4">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-gray-700 mb-4 italic">&ldquo;{review.review}&rdquo;</p>
                    <p className="font-semibold text-gray-900">— {review.name}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Features Deep Dive */}
          {product.features && product.features.length > 5 && (
            <section className="mb-20">
              <h2 className="text-3xl font-bold text-center mb-12">Everything You Get</h2>
              <div className="grid md:grid-cols-2 gap-8">
                {product.features.slice(5).map((feature: string, index: number) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-gray-700">{feature}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* FAQ Section */}
          {product.faqs && product.faqs.length > 0 && (
            <section className="mb-20">
              <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
              <div className="max-w-3xl mx-auto space-y-6">
                {product.faqs.map((faq: any, index: number) => (
                  <details key={index} className="bg-white rounded-xl p-6 shadow-md border border-gray-100 cursor-pointer">
                    <summary className="font-semibold text-lg text-gray-900 flex items-center justify-between">
                      {faq.question}
                    </summary>
                    <p className="mt-4 text-gray-700">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* Final CTA Section */}
          <section className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-white text-center">
            <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl mb-8 opacity-95">
              Join thousands of satisfied customers and transform your workflow today
            </p>
            {price && (
              <div className="mb-8">
                <p className="text-5xl font-bold">
                  {price.amount ? formatPrice(price.amount, price.currency_code) : price.price}
                </p>
                {(product.metadata?.original_price || price.original_price) && (
                  <p className="text-xl opacity-75 line-through mt-2">
                    Regular Price: {product.metadata?.original_price || price.original_price}
                  </p>
                )}
              </div>
            )}
            <a
              href={product.stripe?.price_id
                ? `/api/checkout?price_id=${product.stripe.price_id}`
                : product.purchase_url || "#"}
              className="inline-block bg-white text-blue-600 px-12 py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition transform hover:scale-105"
            >
              {product.pricing?.cta_text || "Get Instant Access Now"}
            </a>
            {product.pricing?.benefits && (
              <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
                {product.pricing.benefits.slice(0, 3).map((benefit: string, index: number) => (
                  <span key={index} className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                    {benefit}
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}