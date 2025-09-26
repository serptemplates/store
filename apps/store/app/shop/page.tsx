import { ProductGrid } from "@/components/shop/product-grid"
import { getProducts } from "@/lib/products-data"

export const metadata = {
  title: "Shop - SERP Store",
  description: "Browse our collection of digital products and tools"
}

export default async function ShopPage() {
  const products = await getProducts()
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to SERP Store
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Discover premium digital products and tools to enhance your workflow
        </p>
      </div>

      {/* Categories/Collections */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Browse Collections</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="/shop/collections/video-downloaders"
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-lg hover:shadow-lg transition-shadow"
          >
            <h3 className="font-semibold text-lg">Video Downloaders</h3>
            <p className="text-sm opacity-90 mt-1">Download from any platform</p>
          </a>
          <a
            href="/shop/collections/learning-tools"
            className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6 rounded-lg hover:shadow-lg transition-shadow"
          >
            <h3 className="font-semibold text-lg">Learning Tools</h3>
            <p className="text-sm opacity-90 mt-1">Educational resources</p>
          </a>
          <a
            href="/shop/collections/stock-assets"
            className="bg-gradient-to-r from-green-500 to-teal-500 text-white p-6 rounded-lg hover:shadow-lg transition-shadow"
          >
            <h3 className="font-semibold text-lg">Stock Assets</h3>
            <p className="text-sm opacity-90 mt-1">Images & media downloads</p>
          </a>
          <a
            href="/shop/collections/all"
            className="bg-gradient-to-r from-gray-600 to-gray-800 text-white p-6 rounded-lg hover:shadow-lg transition-shadow"
          >
            <h3 className="font-semibold text-lg">All Products</h3>
            <p className="text-sm opacity-90 mt-1">Browse everything</p>
          </a>
        </div>
      </div>

      {/* Product Grid */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Featured Products</h2>
        <ProductGrid products={products} />
      </div>

      {/* Benefits Section */}
      <div className="mt-16 grid md:grid-cols-3 gap-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="font-semibold text-lg mb-2">Instant Download</h3>
          <p className="text-gray-600">Get immediate access after purchase</p>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="font-semibold text-lg mb-2">Lifetime Updates</h3>
          <p className="text-gray-600">Free updates for all products</p>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-lg mb-2">Premium Support</h3>
          <p className="text-gray-600">Get help when you need it</p>
        </div>
      </div>
    </div>
  )
}