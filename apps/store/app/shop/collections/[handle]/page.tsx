import { ProductGrid } from "@/components/shop/product-grid"
import { getProductsByCollection } from "@/lib/products-data"

interface CollectionPageProps {
  params: {
    handle: string
  }
}

export function generateStaticParams() {
  return [
    { handle: "video-downloaders" },
    { handle: "learning-tools" },
    { handle: "stock-assets" },
    { handle: "all" },
  ]
}

export async function generateMetadata({ params }: CollectionPageProps) {
  const titles: Record<string, string> = {
    "video-downloaders": "Video Downloaders",
    "learning-tools": "Learning Tools",
    "stock-assets": "Stock Assets",
    "all": "All Products"
  }

  const title = titles[params.handle] || "Collection"

  return {
    title: `${title} - SERP Store`,
    description: `Browse our ${title.toLowerCase()} collection`
  }
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const products = await getProductsByCollection(params.handle)
  const collections: Record<string, { title: string; description: string }> = {
    "video-downloaders": {
      title: "Video Downloaders",
      description: "Download videos from any platform with our premium tools"
    },
    "learning-tools": {
      title: "Learning Tools",
      description: "Educational resources and course downloaders"
    },
    "stock-assets": {
      title: "Stock Assets",
      description: "Download stock images, videos, and other media assets"
    },
    "all": {
      title: "All Products",
      description: "Browse our complete collection of digital products"
    }
  }

  const collection = collections[params.handle] || collections.all

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm mb-6">
        <ol className="flex items-center space-x-2 text-gray-500">
          <li><a href="/shop" className="hover:text-gray-700">Shop</a></li>
          <li>/</li>
          <li><a href="/shop/collections" className="hover:text-gray-700">Collections</a></li>
          <li>/</li>
          <li className="text-gray-900 font-medium">{collection.title}</li>
        </ol>
      </nav>

      {/* Collection Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{collection.title}</h1>
        <p className="text-lg text-gray-600">{collection.description}</p>
      </div>

      {/* Filters and Sorting */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter
            </span>
          </button>
        </div>
        <select className="px-4 py-2 border border-gray-300 rounded-lg bg-white">
          <option>Sort: Featured</option>
          <option>Sort: Price (Low to High)</option>
          <option>Sort: Price (High to Low)</option>
          <option>Sort: Newest First</option>
        </select>
      </div>

      {/* Product Grid */}
      <ProductGrid products={products} />

      {/* Related Collections */}
      {params.handle !== "all" && (
        <div className="mt-16">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Other Collections</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(collections)
              .filter(([key]) => key !== params.handle && key !== "all")
              .map(([key, value]) => (
                <a
                  key={key}
                  href={`/shop/collections/${key}`}
                  className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-sm transition"
                >
                  <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                  <p className="text-gray-600 text-sm">{value.description}</p>
                </a>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}