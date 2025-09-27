import Link from "next/link"
import Image from "next/image"
import { Product, formatPrice } from "@/lib/products-data"
import { getBrandLogoPath } from "@/lib/brand-logos"

interface ProductGridProps {
  products: Product[]
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-gray-700">No products found</h3>
        <p className="text-gray-500 mt-2">Check back later for new products!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => {
        const price = product.variants[0]?.prices[0]
        const brandLogoPath = getBrandLogoPath(product.handle)
        const imageSource = brandLogoPath || product.thumbnail

        return (
          <Link
            key={product.id}
            href={`/shop/products/${product.handle}`}
            className="group"
          >
            <div className="relative overflow-hidden rounded-lg bg-gray-100 aspect-square mb-4">
              {imageSource ? (
                <Image
                  src={imageSource}
                  alt={product.title}
                  fill
                  className={`${brandLogoPath ? 'object-contain p-8' : 'object-cover'} group-hover:scale-105 transition-transform duration-300`}
                  unoptimized // For external images
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg
                    className="w-16 h-16"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
              )}
            </div>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
              {product.title}
            </h3>
            {price && (
              <div className="mt-1">
                <span className="text-lg font-bold text-gray-900">
                  {formatPrice(price.amount, price.currency_code)}
                </span>
                {product.metadata?.original_price && (
                  <span className="ml-2 text-sm text-gray-500 line-through">
                    {product.metadata.original_price}
                  </span>
                )}
              </div>
            )}
          </Link>
        )
      })}
    </div>
  )
}