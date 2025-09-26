'use client'

import { useState, useRef } from 'react'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'

interface RelatedProduct {
  id: string
  name: string
  price: number
  image: string
  rating?: number
  reviewCount?: number
  handle: string
}

interface RelatedProductsProps {
  products?: RelatedProduct[]
  title?: string
}

export function RelatedProducts({ products, title = 'You May Also Like' }: RelatedProductsProps) {
  const [scrollPosition, setScrollPosition] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const mockProducts: RelatedProduct[] = [
    {
      id: '1',
      name: 'Premium Package',
      price: 299,
      image: '/api/placeholder/300/300',
      rating: 4.8,
      reviewCount: 124,
      handle: 'premium-package'
    },
    {
      id: '2',
      name: 'Starter Bundle',
      price: 99,
      image: '/api/placeholder/300/300',
      rating: 4.5,
      reviewCount: 89,
      handle: 'starter-bundle'
    },
    {
      id: '3',
      name: 'Professional Suite',
      price: 499,
      image: '/api/placeholder/300/300',
      rating: 4.9,
      reviewCount: 201,
      handle: 'professional-suite'
    },
    {
      id: '4',
      name: 'Essential Tools',
      price: 149,
      image: '/api/placeholder/300/300',
      rating: 4.6,
      reviewCount: 156,
      handle: 'essential-tools'
    },
    {
      id: '5',
      name: 'Advanced System',
      price: 799,
      image: '/api/placeholder/300/300',
      rating: 4.7,
      reviewCount: 98,
      handle: 'advanced-system'
    },
    {
      id: '6',
      name: 'Basic Edition',
      price: 49,
      image: '/api/placeholder/300/300',
      rating: 4.4,
      reviewCount: 234,
      handle: 'basic-edition'
    }
  ]

  const displayProducts = products?.length ? products : mockProducts

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return

    const scrollAmount = 320
    const newPosition = direction === 'left'
      ? Math.max(0, scrollPosition - scrollAmount)
      : Math.min(
          scrollRef.current.scrollWidth - scrollRef.current.clientWidth,
          scrollPosition + scrollAmount
        )

    scrollRef.current.scrollTo({
      left: newPosition,
      behavior: 'smooth'
    })

    setScrollPosition(newPosition)
  }

  const canScrollLeft = scrollPosition > 0
  const canScrollRight = scrollRef.current
    ? scrollPosition < scrollRef.current.scrollWidth - scrollRef.current.clientWidth
    : true

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">{title}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={`p-2 rounded-lg border ${
                canScrollLeft
                  ? 'bg-white hover:bg-gray-50 border-gray-300'
                  : 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={`p-2 rounded-lg border ${
                canScrollRight
                  ? 'bg-white hover:bg-gray-50 border-gray-300'
                  : 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="relative">
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {displayProducts.map((product) => (
              <a
                key={product.id}
                href={`/shop/products/${product.handle}`}
                className="flex-shrink-0 w-72 bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition group"
              >
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                    Save 20%
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
                    {product.name}
                  </h3>
                  {product.rating && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium ml-1">{product.rating}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        ({product.reviewCount} reviews)
                      </span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold">${product.price}</span>
                    <span className="text-sm text-gray-500 line-through">
                      ${Math.round(product.price * 1.25)}
                    </span>
                  </div>
                  <button className="mt-3 w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition text-sm">
                    Quick View
                  </button>
                </div>
              </a>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/shop"
            className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
          >
            View All Products
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  )
}