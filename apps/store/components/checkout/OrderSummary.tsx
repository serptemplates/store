import Image from "next/image"
import { getBrandLogoPath } from "@/lib/brand-logos"

interface OrderSummaryProps {
  product: any
  displayPrice: string
  originalPrice?: string
}

export function OrderSummary({ product, displayPrice, originalPrice }: OrderSummaryProps) {
  const brandLogoPath = getBrandLogoPath(product.slug)
  const mainImageSource = brandLogoPath || product.thumbnail || product.featured_image

  // Calculate discount if original price exists
  const discount = originalPrice ? (
    <span className="text-sm text-green-600">
      You save: {originalPrice}
    </span>
  ) : null

  const benefits = product.pricing?.benefits || product.metadata?.benefits || []
  const features = product.features || product.metadata?.features || []

  return (
    <div className="bg-white rounded-lg shadow p-6 sticky top-4">
      <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

      {/* Product Info */}
      <div className="border-b pb-4 mb-4">
        <div className="flex gap-4">
          {mainImageSource && (
            <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              <Image
                src={mainImageSource}
                alt={product.name || product.title}
                fill
                className={brandLogoPath ? "object-contain p-2" : "object-cover"}
                unoptimized
              />
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">{product.name || product.title}</h3>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {product.tagline || product.description}
            </p>
          </div>
        </div>
      </div>

      {/* What's Included */}
      {(benefits.length > 0 || features.length > 0) && (
        <div className="border-b pb-4 mb-4">
          <h3 className="font-medium text-gray-900 mb-2">What&apos;s Included:</h3>
          <ul className="space-y-1 text-sm">
            {[...benefits, ...features].slice(0, 5).map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pricing Details */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal</span>
          <span className="text-gray-900">{displayPrice}</span>
        </div>
        {originalPrice && (
          <div className="flex justify-between">
            <span className="text-gray-600">Original Price</span>
            <span className="text-gray-500 line-through">{originalPrice}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-600">Tax</span>
          <span className="text-gray-900">Calculated at checkout</span>
        </div>
      </div>

      {/* Total */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Total</span>
          <div className="text-right">
            <span className="text-2xl font-bold text-gray-900">{displayPrice}</span>
            {discount && <div className="text-sm text-green-600 mt-1">{discount}</div>}
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>SSL Encrypted Payment</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>Money Back Guarantee</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Instant Digital Delivery</span>
        </div>
      </div>

      {/* Customer Support */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          Need help? Contact support at{" "}
          <a href="#" className="text-blue-600 hover:underline">
            support@apps.serp.co
          </a>
        </p>
      </div>
    </div>
  )
}