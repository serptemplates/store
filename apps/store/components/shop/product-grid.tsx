import Link from "next/link"
import Image from "next/image"
import { Product, formatPrice } from "@/lib/products/products-data"
import { getBrandLogoPath } from "@/lib/products/brand-logos"
import { shouldShowNewReleaseBanner } from "@/lib/products/badge-config"

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

        const showNewReleaseBadge =
          product.new_release && !product.pre_release && shouldShowNewReleaseBanner(product.handle)

        const bannerType = product.pre_release
          ? "preRelease"
          : showNewReleaseBadge
            ? "newRelease"
            : product.popular
              ? "popular"
              : null

        const bannerText =
          bannerType === "preRelease"
            ? "Pre Release"
            : bannerType === "newRelease"
              ? "New Release"
              : bannerType === "popular"
                ? "Most Popular"
                : ""

        const bannerClass =
          bannerType === "preRelease"
            ? "from-purple-500 to-purple-600"
            : bannerType === "newRelease"
              ? "from-emerald-500 to-teal-600"
              : bannerType === "popular"
                ? "from-amber-400 via-amber-500 to-yellow-500"
                : ""

        return (
          <Link
            key={product.id}
            href={`/${product.handle}`}
            className="group relative block"
          >
            {bannerType && (
              <div
                className={`absolute -right-12 top-6 z-10 rotate-45 bg-gradient-to-r ${bannerClass} px-12 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-md`}
              >
                {bannerText}
              </div>
            )}
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
