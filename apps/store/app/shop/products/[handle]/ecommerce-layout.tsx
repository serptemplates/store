import Image from "next/image"
import Link from "next/link"
import type { Route } from "next"
import { formatPrice } from "@/lib/products-data"
import { getBrandLogoPath } from "@/lib/brand-logos"

const SHOP_ROUTE = "/shop" satisfies Route

export default function EcommerceLayout({ product }: { product: any }) {
  const price = product.variants?.[0]?.prices?.[0] || product.pricing
  const handle = product.handle || product.slug
  const brandLogoPath = getBrandLogoPath(handle)
  const mainImageSource = brandLogoPath || product.thumbnail || product.featured_image

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm mb-6">
        <ol className="flex items-center space-x-2 text-gray-500">
          <li><Link href={SHOP_ROUTE} className="hover:text-gray-700">Shop</Link></li>
          <li>/</li>
          <li className="hover:text-gray-700">Products</li>
          <li>/</li>
          <li className="text-gray-900 font-medium">{product.title || product.name}</li>
        </ol>
      </nav>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Product Images */}
        <div>
          <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
            {mainImageSource ? (
              <Image
                src={mainImageSource}
                alt={product.title || product.name}
                fill
                className={`${brandLogoPath ? 'object-contain p-12' : 'object-cover'}`}
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            )}
          </div>

          {/* Additional Images */}
          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2 mt-4">
              {product.images.slice(0, 4).map((image: any, index: number) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <Image
                    src={image.url}
                    alt={`${product.title || product.name} ${index + 1}`}
                    fill
                    className="object-cover cursor-pointer hover:opacity-80 transition"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.title || product.name}</h1>

          {price && (
            <div className="mb-6">
              <p className="text-3xl font-semibold text-gray-900">
                {price.amount ? formatPrice(price.amount, price.currency_code) : price.price}
              </p>
              {(product.metadata?.original_price || price.original_price) && (
                <p className="text-lg text-gray-500 line-through">
                  {product.metadata?.original_price || price.original_price}
                </p>
              )}
            </div>
          )}

          <div className="prose prose-gray mb-6">
            <p>{product.description || "No description available."}</p>
          </div>

          {/* Add to Cart */}
          <div className="flex gap-4 mb-8">
            <a
              href={product.stripe?.price_id
                ? `/api/checkout?price_id=${product.stripe.price_id}`
                : product.metadata?.stripe_price_id
                ? `https://buy.stripe.com/test/${product.metadata.stripe_price_id}`
                : product.purchase_url || "#"}
              className="flex-1 bg-blue-600 text-white text-center py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              {product.pricing?.cta_text || "Buy Now"}
            </a>
            <button className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>

          {/* Features */}
          {(product.features || product.metadata?.features) && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-lg mb-4">Features</h3>
              <ul className="space-y-2">
                {(product.features || product.metadata.features).map((feature: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Benefits */}
          {(product.pricing?.benefits || product.metadata?.benefits) && (
            <div className="border-t pt-6 mt-6">
              <h3 className="font-semibold text-lg mb-4">What You Get</h3>
              <ul className="space-y-2">
                {(product.pricing?.benefits || product.metadata.benefits).map((benefit: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Trust Badges */}
          <div className="border-t pt-6 mt-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Secure Checkout
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Safe Payment
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Instant Access
              </div>
            </div>
          </div>

          {/* GitHub Link */}
          {(product.github_repo_url || product.metadata?.github_repo_url) && (
            <div className="mt-6">
              <a
                href={product.github_repo_url || product.metadata.github_repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                View on GitHub
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Product Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            name: product.title || product.name,
            description: product.description,
            image: mainImageSource,
            offers: {
              "@type": "Offer",
              price: price?.amount || price?.price || "0",
              priceCurrency: price?.currency_code || "USD",
              availability: "https://schema.org/InStock",
              seller: {
                "@type": "Organization",
                name: "SERP Apps"
              }
            }
          })
        }}
      />
    </div>
  )
}