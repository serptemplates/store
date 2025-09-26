'use client'

import { useState } from 'react'
import { Star, ThumbsUp, User } from 'lucide-react'

interface Review {
  id: string
  author: string
  rating: number
  date: string
  title: string
  content: string
  helpful: number
  verified: boolean
}

const mockReviews: Review[] = [
  {
    id: '1',
    author: 'Sarah M.',
    rating: 5,
    date: '2024-01-15',
    title: 'Excellent product, exactly as described',
    content: 'I\'ve been using this for a month now and it\'s exceeded my expectations. The quality is outstanding and the features work perfectly. Highly recommend!',
    helpful: 42,
    verified: true
  },
  {
    id: '2',
    author: 'James T.',
    rating: 4,
    date: '2024-01-10',
    title: 'Great value for money',
    content: 'Good product overall. Does what it says on the tin. Only minor issue is the setup took a bit longer than expected, but support was helpful.',
    helpful: 28,
    verified: true
  },
  {
    id: '3',
    author: 'Emily R.',
    rating: 5,
    date: '2024-01-05',
    title: 'Game changer!',
    content: 'This has completely transformed my workflow. Can\'t imagine working without it now. The time savings alone make it worth every penny.',
    helpful: 35,
    verified: true
  }
]

export function ReviewsSection() {
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState('helpful')

  const averageRating = 4.7
  const totalReviews = 156
  const ratingDistribution = [
    { stars: 5, count: 98, percentage: 63 },
    { stars: 4, count: 42, percentage: 27 },
    { stars: 3, count: 10, percentage: 6 },
    { stars: 2, count: 4, percentage: 3 },
    { stars: 1, count: 2, percentage: 1 }
  ]

  const filteredReviews = selectedRating
    ? mockReviews.filter(r => r.rating === selectedRating)
    : mockReviews

  return (
    <section className="py-16 border-t">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold mb-8">Customer Reviews</h2>

        {/* Rating Summary */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <span className="text-4xl font-bold">{averageRating}</span>
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-6 h-6 ${
                      i < Math.floor(averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-gray-200 text-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-600">Based on {totalReviews} reviews</p>
          </div>

          {/* Rating Distribution */}
          <div className="col-span-2">
            <div className="space-y-2">
              {ratingDistribution.map((dist) => (
                <button
                  key={dist.stars}
                  onClick={() => setSelectedRating(dist.stars === selectedRating ? null : dist.stars)}
                  className={`w-full flex items-center gap-2 hover:opacity-80 transition ${
                    selectedRating === dist.stars ? 'opacity-100' : 'opacity-70'
                  }`}
                >
                  <span className="text-sm w-12">{dist.stars} star</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-yellow-400 h-full rounded-full"
                      style={{ width: `${dist.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm w-12 text-right">{dist.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            {selectedRating && (
              <button
                onClick={() => setSelectedRating(null)}
                className="text-sm px-3 py-1 bg-gray-100 rounded-full hover:bg-gray-200"
              >
                Clear filter
              </button>
            )}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm px-3 py-1 border rounded-lg"
          >
            <option value="helpful">Most Helpful</option>
            <option value="recent">Most Recent</option>
            <option value="rating-high">Highest Rated</option>
            <option value="rating-low">Lowest Rated</option>
          </select>
        </div>

        {/* Reviews List */}
        <div className="space-y-6">
          {filteredReviews.map((review) => (
            <div key={review.id} className="border-b pb-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{review.author}</span>
                        {review.verified && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            Verified Purchase
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'fill-gray-200 text-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span>·</span>
                        <span>{new Date(review.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <h3 className="font-semibold mb-2">{review.title}</h3>
              <p className="text-gray-700 mb-4">{review.content}</p>

              <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                <ThumbsUp className="w-4 h-4" />
                Helpful ({review.helpful})
              </button>
            </div>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-8">
          <button className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            Load More Reviews
          </button>
        </div>

        {/* Write a Review */}
        <div className="mt-12 p-6 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-4">Write a Review</h3>
          <p className="text-sm text-gray-600 mb-4">
            Share your experience with this product to help others make their decision.
          </p>
          <button className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800">
            Write Your Review
          </button>
        </div>
      </div>
    </section>
  )
}