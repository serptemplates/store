'use client'

import Image from 'next/image'
import AddToCartButton from '@/components/add-to-cart-button'
import CheckoutButton from '@/components/checkout-button'
import { StarIcon } from '@heroicons/react/20/solid'
import { Disclosure, Tab } from '@headlessui/react'
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import BrandLogo from './brand-logo'

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

interface ProductDetailsProps {
  product: {
    id: string
    slug: string
    name: string
    price: string
    originalPrice?: string
    description?: string
    tagline?: string
    featuredImage: string
    images?: string[]
    rating?: number
    reviewCount?: number
    features?: Record<string, string>
    benefits?: string[]
    platform?: string
    category?: string
    stripePriceId?: string
    githubRepoUrl?: string
  }
}

export default function ProductDetailsClient({ product }: ProductDetailsProps) {
  const reviews = { average: product.rating || 4.5, totalCount: product.reviewCount || 50 }

  // Prepare image array
  const allImages = [
    product.featuredImage,
    ...(product.images || []).filter((img: string) => img !== product.featuredImage)
  ].filter(Boolean)

  // Product details sections
  const productDetails = [
    {
      name: 'Features',
      items: product.features ? Object.entries(product.features).map(([key, value]) => `${key}: ${value}`) : []
    },
    {
      name: 'Benefits',
      items: product.benefits || []
    },
    {
      name: 'Details',
      items: [
        product.platform && `Platform: ${product.platform}`,
        product.category && `Category: ${product.category}`,
        product.stripePriceId && 'Secure checkout with Stripe',
        'Instant digital delivery',
        'Lifetime access and updates'
      ].filter(Boolean)
    }
  ]

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:max-w-7xl lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-8">
          {/* Image gallery */}
          <Tab.Group as="div" className="flex flex-col-reverse">
            {/* Image selector */}
            <div className="mx-auto mt-6 hidden w-full max-w-2xl sm:block lg:max-w-none">
              <Tab.List className="grid grid-cols-4 gap-6">
                {allImages.map((image, index) => (
                  <Tab
                    key={index}
                    className="relative flex h-24 cursor-pointer items-center justify-center rounded-md bg-white text-sm font-medium uppercase text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring focus:ring-opacity-50 focus:ring-offset-4"
                  >
                    {({ selected }) => (
                      <>
                        <span className="sr-only">{product.name} image {index + 1}</span>
                        <span className="absolute inset-0 overflow-hidden rounded-md">
                          <Image
                            src={image}
                            alt=""
                            width={200}
                            height={200}
                            className="h-full w-full object-cover object-center"
                          />
                        </span>
                        <span
                          className={classNames(
                            selected ? 'ring-indigo-500' : 'ring-transparent',
                            'pointer-events-none absolute inset-0 rounded-md ring-2 ring-offset-2'
                          )}
                          aria-hidden="true"
                        />
                      </>
                    )}
                  </Tab>
                ))}
              </Tab.List>
            </div>

            <Tab.Panels className="aspect-h-1 aspect-w-1 w-full">
              {allImages.map((image, index) => (
                <Tab.Panel key={index}>
                  <Image
                    src={image}
                    alt={product.name}
                    width={600}
                    height={600}
                    className="h-full w-full object-cover object-center sm:rounded-lg"
                  />
                </Tab.Panel>
              ))}
            </Tab.Panels>
          </Tab.Group>

          {/* Product info */}
          <div className="mt-10 px-4 sm:mt-16 sm:px-0 lg:mt-0">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb">
              <ol role="list" className="flex items-center space-x-2">
                <li>
                  <div className="flex items-center text-sm">
                    <Link href="/products" className="font-medium text-gray-500 hover:text-gray-900">
                      All Products
                    </Link>
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                      className="ml-2 h-5 w-5 flex-shrink-0 text-gray-300"
                    >
                      <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                    </svg>
                  </div>
                </li>
                <li>
                  <div className="flex items-center text-sm">
                    <Link href="/products" className="font-medium text-gray-500 hover:text-gray-900">
                      {product.category}
                    </Link>
                  </div>
                </li>
              </ol>
            </nav>

            <div className="mt-4 flex items-center gap-4">
              <BrandLogo slug={product.slug} className="h-12 w-12" />
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{product.name}</h1>
            </div>

            <section aria-labelledby="information-heading" className="mt-4">
              <h2 id="information-heading" className="sr-only">
                Product information
              </h2>

              <div className="flex items-center">
                <div className="flex items-baseline gap-4">
                  <p className="text-3xl tracking-tight text-gray-900">{product.price}</p>
                  {product.originalPrice && (
                    <p className="text-xl text-gray-500 line-through">{product.originalPrice}</p>
                  )}
                </div>

                <div className="ml-4 border-l border-gray-300 pl-4">
                  <h2 className="sr-only">Reviews</h2>
                  <div className="flex items-center">
                    <div className="flex items-center">
                      {[0, 1, 2, 3, 4].map((rating) => (
                        <StarIcon
                          key={rating}
                          className={classNames(
                            reviews.average > rating ? 'text-yellow-400' : 'text-gray-300',
                            'h-5 w-5 flex-shrink-0'
                          )}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    <p className="sr-only">{reviews.average} out of 5 stars</p>
                    <span className="ml-2 text-sm text-gray-500">({reviews.totalCount} reviews)</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-6">
                <p className="text-base text-gray-600">
                  {product.description}
                </p>
                {product.tagline && product.tagline !== product.description && (
                  <p className="text-base font-medium text-gray-900">{product.tagline}</p>
                )}
              </div>

              <div className="mt-6 flex items-center">
                <svg className="h-5 w-5 flex-shrink-0 text-green-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
                <p className="ml-2 text-sm text-gray-500">In stock and ready to ship</p>
              </div>
            </section>

            <section aria-labelledby="options-heading" className="mt-6">
              <h2 id="options-heading" className="sr-only">
                Product options
              </h2>

              <form>
                <div className="mt-8 space-y-3">
                  <CheckoutButton
                    product={{
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      image: product.featuredImage,
                    }}
                  />
                  <AddToCartButton
                    product={{
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      image: product.featuredImage,
                    }}
                  />
                </div>

                {/* Product actions */}
                <div className="mt-6 flex gap-4">
                  {product.githubRepoUrl && (
                    <a
                      href={product.githubRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      View on GitHub
                    </a>
                  )}
                  <button
                    type="button"
                    className="flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" />
                    </svg>
                    Add to favorites
                  </button>
                </div>

                <div className="mt-10">
                  <p className="text-sm text-gray-500">
                    <svg className="mr-2 inline h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                    </svg>
                    Secure checkout with Stripe
                  </p>
                </div>
              </form>
            </section>

            {/* Product details (expandable) */}
            <section aria-labelledby="details-heading" className="mt-12">
              <h2 id="details-heading" className="sr-only">
                Additional details
              </h2>

              <div className="divide-y divide-gray-200 border-t">
                {productDetails.map((detail) => (
                  detail.items.length > 0 && (
                    <Disclosure as="div" key={detail.name}>
                      {({ open }) => (
                        <>
                          <h3>
                            <Disclosure.Button className="group relative flex w-full items-center justify-between py-6 text-left">
                              <span
                                className={classNames(
                                  open ? 'text-indigo-600' : 'text-gray-900',
                                  'text-sm font-medium'
                                )}
                              >
                                {detail.name}
                              </span>
                              <span className="ml-6 flex items-center">
                                {open ? (
                                  <MinusIcon
                                    className="block h-6 w-6 text-indigo-400 group-hover:text-indigo-500"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <PlusIcon
                                    className="block h-6 w-6 text-gray-400 group-hover:text-gray-500"
                                    aria-hidden="true"
                                  />
                                )}
                              </span>
                            </Disclosure.Button>
                          </h3>
                          <Disclosure.Panel as="div" className="prose prose-sm pb-6">
                            <ul role="list">
                              {detail.items.map((item, itemIdx) => (
                                <li key={itemIdx}>{item}</li>
                              ))}
                            </ul>
                          </Disclosure.Panel>
                        </>
                      )}
                    </Disclosure>
                  )
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}