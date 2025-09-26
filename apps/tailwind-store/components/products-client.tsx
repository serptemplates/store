'use client'

import { useState, Fragment } from 'react'
import { Dialog, Disclosure, Menu, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { ChevronDownIcon, FunnelIcon, MinusIcon, PlusIcon, Squares2X2Icon } from '@heroicons/react/20/solid'
import Link from 'next/link'
import type { Product } from '@/lib/products'
import BrandLogo from './brand-logo'

const sortOptions = [
  { name: 'Most Popular', href: '#', current: true },
  { name: 'Best Rating', href: '#', current: false },
  { name: 'Newest', href: '#', current: false },
  { name: 'Price: Low to High', href: '#', current: false },
  { name: 'Price: High to Low', href: '#', current: false },
]

const categories = [
  { value: 'all', label: 'All Products' },
  { value: 'adult', label: 'Adult' },
  { value: 'learning', label: 'Learning Platforms' },
  { value: 'streaming', label: 'Streaming' },
  { value: 'audio', label: 'Audio Hosting' },
  { value: 'downloaders', label: 'Downloaders' },
  { value: 'ai', label: 'Artificial Intelligence' },
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

interface ProductsClientProps {
  products: Product[]
  category?: string
}

export default function ProductsClient({ products, category }: ProductsClientProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(category || 'all')

  // Filter products based on selected category
  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => {
        const cat = p.category.toLowerCase()
        if (selectedCategory === 'adult') return cat === 'adult'
        if (selectedCategory === 'learning') return cat === 'learning platforms'
        if (selectedCategory === 'streaming') return cat === 'streaming'
        if (selectedCategory === 'audio') return cat === 'audio hosting'
        if (selectedCategory === 'downloaders') return cat === 'downloaders'
        if (selectedCategory === 'ai') return cat === 'artificial intelligence'
        return true
      })

  const getCategoryTitle = () => {
    switch(selectedCategory) {
      case 'adult': return 'Adult Content Tools'
      case 'learning': return 'Learning Platform Tools'
      case 'streaming': return 'Streaming Downloaders'
      case 'audio': return 'Audio & Music Tools'
      case 'downloaders': return 'All Downloaders'
      case 'ai': return 'AI-Powered Tools'
      default: return 'All Products'
    }
  }

  const getCategoryDescription = () => {
    switch(selectedCategory) {
      case 'adult': return 'Premium tools for adult content platforms and creators'
      case 'learning': return 'Download and manage content from online learning platforms'
      case 'streaming': return 'Save videos from streaming services for offline viewing'
      case 'audio': return 'Download and convert audio from music platforms'
      case 'downloaders': return 'Complete collection of downloading tools for all platforms'
      case 'ai': return 'Cutting-edge AI tools for content creation and automation'
      default: return 'Browse our complete collection of premium digital tools and downloaders'
    }
  }

  return (
    <div className="bg-white">
      {/* Mobile filter dialog */}
      <Transition.Root show={mobileFiltersOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40 lg:hidden" onClose={setMobileFiltersOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 z-40 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="translate-x-full"
            >
              <Dialog.Panel className="relative ml-auto flex h-full w-full max-w-xs flex-col overflow-y-auto bg-white py-4 pb-12 shadow-xl">
                <div className="flex items-center justify-between px-4">
                  <h2 className="text-lg font-medium text-gray-900">Filters</h2>
                  <button
                    type="button"
                    className="-mr-2 flex h-10 w-10 items-center justify-center rounded-md bg-white p-2 text-gray-400"
                    onClick={() => setMobileFiltersOpen(false)}
                  >
                    <span className="sr-only">Close menu</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                {/* Filters */}
                <form className="mt-4 border-t border-gray-200">
                  <Disclosure as="div" className="border-b border-gray-200 px-4 py-6">
                    {({ open }) => (
                      <>
                        <h3 className="-mx-2 -my-3 flow-root">
                          <Disclosure.Button className="flex w-full items-center justify-between bg-white px-2 py-3 text-gray-400 hover:text-gray-500">
                            <span className="font-medium text-gray-900">Category</span>
                            <span className="ml-6 flex items-center">
                              {open ? (
                                <MinusIcon className="h-5 w-5" aria-hidden="true" />
                              ) : (
                                <PlusIcon className="h-5 w-5" aria-hidden="true" />
                              )}
                            </span>
                          </Disclosure.Button>
                        </h3>
                        <Disclosure.Panel className="pt-6">
                          <div className="space-y-4">
                            {categories.map((option) => (
                              <div key={option.value} className="flex items-center">
                                <input
                                  id={`filter-mobile-category-${option.value}`}
                                  name="category"
                                  value={option.value}
                                  type="radio"
                                  checked={selectedCategory === option.value}
                                  onChange={() => setSelectedCategory(option.value)}
                                  className="h-4 w-4 rounded-full border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label
                                  htmlFor={`filter-mobile-category-${option.value}`}
                                  className="ml-3 text-sm text-gray-600"
                                >
                                  {option.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </Disclosure.Panel>
                      </>
                    )}
                  </Disclosure>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-baseline justify-between border-b border-gray-200 pb-6 pt-24">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">{getCategoryTitle()}</h1>
            <p className="mt-2 text-base text-gray-500">{getCategoryDescription()}</p>
          </div>

          <div className="flex items-center">
            <Menu as="div" className="relative inline-block text-left">
              <div>
                <Menu.Button className="group inline-flex justify-center text-sm font-medium text-gray-700 hover:text-gray-900">
                  Sort
                  <ChevronDownIcon
                    className="-mr-1 ml-1 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-500"
                    aria-hidden="true"
                  />
                </Menu.Button>
              </div>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-md bg-white shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="py-1">
                    {sortOptions.map((option) => (
                      <Menu.Item key={option.name}>
                        {({ active }) => (
                          <a
                            href={option.href}
                            className={classNames(
                              option.current ? 'font-medium text-gray-900' : 'text-gray-500',
                              active ? 'bg-gray-100' : '',
                              'block px-4 py-2 text-sm'
                            )}
                          >
                            {option.name}
                          </a>
                        )}
                      </Menu.Item>
                    ))}
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>

            <button type="button" className="-m-2 ml-5 p-2 text-gray-400 hover:text-gray-500 sm:ml-7">
              <span className="sr-only">View grid</span>
              <Squares2X2Icon className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="-m-2 ml-4 p-2 text-gray-400 hover:text-gray-500 sm:ml-6 lg:hidden"
              onClick={() => setMobileFiltersOpen(true)}
            >
              <span className="sr-only">Filters</span>
              <FunnelIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <section aria-labelledby="products-heading" className="pb-24 pt-6">
          <h2 id="products-heading" className="sr-only">
            Products
          </h2>

          <div className="grid grid-cols-1 gap-x-8 gap-y-10 lg:grid-cols-4">
            {/* Filters */}
            <form className="hidden lg:block">
              <h3 className="sr-only">Categories</h3>
              <ul role="list" className="space-y-4 border-b border-gray-200 pb-6 text-sm font-medium text-gray-900">
                {categories.map((category) => (
                  <li key={category.value}>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(category.value)}
                      className={classNames(
                        selectedCategory === category.value ? 'text-indigo-600' : 'text-gray-900',
                        'hover:text-indigo-600 transition-colors'
                      )}
                    >
                      {category.label}
                    </button>
                  </li>
                ))}
              </ul>
            </form>

            {/* Product grid */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
                {filteredProducts.map((product) => (
                  <Link key={product.id} href={`/product/${product.slug}`} className="group">
                    <div className="w-full h-48 rounded-lg border border-gray-200 bg-white flex items-center justify-center p-8">
                      <BrandLogo slug={product.slug} className="h-16 w-16" />
                    </div>
                    <h3 className="mt-4 text-sm text-gray-700">{product.name}</h3>
                    <p className="mt-1 text-lg font-medium text-gray-900">{product.price}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}