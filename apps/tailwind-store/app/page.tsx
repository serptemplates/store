import Link from 'next/link'
import Image from 'next/image'
import { getProducts } from '@/lib/products'
import Header from '@/components/header'
import BrandLogo from '@/components/brand-logo'

const testimonials = [
  {
    id: 1,
    quote: "These tools have completely transformed my workflow. The quality is outstanding and the value is unmatched.",
    author: "Sarah Johnson",
    role: "Digital Marketing Manager",
  },
  {
    id: 2,
    quote: "I've tried many similar products, but nothing comes close to the quality and ease of use of these resources.",
    author: "Michael Chen",
    role: "UX Designer",
  },
  {
    id: 3,
    quote: "The customer support is incredible and the products are exactly what I needed for my business.",
    author: "Emily Rodriguez",
    role: "Freelance Developer",
  },
]


export default async function HomePage() {
  const products = await getProducts()
  // const categories = await getCategories()
  // const featuredProducts = products.slice(0, 8)
  const trendingProducts = products.slice(0, 4)

  return (
    <div className="bg-white">
      <Header />

      {/* Mobile menu */}
      <div className="relative z-40 lg:hidden" role="dialog" aria-modal="true">
        {/* Mobile menu backdrop */}
      </div>

      <main>
        {/* Hero */}
        <div className="flex flex-col border-b border-gray-200 lg:border-0">
          <div className="relative">
            <div aria-hidden="true" className="absolute hidden h-full w-1/2 bg-gray-100 lg:block" />
            <div className="relative bg-gray-100 lg:bg-transparent">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:grid lg:grid-cols-2 lg:px-8">
                <div className="mx-auto max-w-2xl py-24 lg:max-w-none lg:py-64">
                  <div className="lg:pr-16">
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl xl:text-6xl">
                      Focus on what matters
                    </h1>
                    <p className="mt-4 text-xl text-gray-600">
                      All the tools and resources you need to take your digital projects to the next level. Built by creators, for creators.
                    </p>
                    <div className="mt-6">
                      <Link
                        href="/products"
                        className="inline-block rounded-md border border-transparent bg-indigo-600 px-8 py-3 font-medium text-white hover:bg-indigo-700"
                      >
                        Shop Productivity
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-48 w-full sm:h-64 lg:absolute lg:right-0 lg:top-0 lg:h-full lg:w-1/2">
              <Image
                src="https://tailwindui.com/plus/img/ecommerce-images/home-page-02-hero-half-width.jpg"
                alt="Hero"
                width={1000}
                height={1000}
                className="h-full w-full object-cover object-center"
              />
            </div>
          </div>
        </div>

        {/* Categories */}
        <section aria-labelledby="categories-heading" className="bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <div className="sm:flex sm:items-baseline sm:justify-between">
              <h2 id="categories-heading" className="text-2xl font-bold tracking-tight text-gray-900">
                Shop by Category
              </h2>
              <Link href="/products" className="hidden text-sm font-semibold text-indigo-600 hover:text-indigo-500 sm:block">
                Browse all categories
                <span aria-hidden="true"> &rarr;</span>
              </Link>
            </div>

            <div className="mt-6 flex overflow-x-auto pb-2 sm:pb-0">
              <div className="flex space-x-8">
                {/* Adult Category */}
                <Link href="/products?category=Adult" className="flex-shrink-0">
                  <div className="relative h-80 w-56 overflow-hidden rounded-lg bg-gray-200">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <p className="mt-2 text-xl font-semibold text-gray-900">Adult</p>
                        <p className="mt-1 text-sm text-gray-600">Premium content</p>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Learning Platforms Category */}
                <Link href="/products?category=Learning Platforms" className="flex-shrink-0">
                  <div className="relative h-80 w-56 overflow-hidden rounded-lg bg-gray-200">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <p className="mt-2 text-xl font-semibold text-gray-900">Learning Platforms</p>
                        <p className="mt-1 text-sm text-gray-600">Educational tools</p>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Streaming Category */}
                <Link href="/products?category=Streaming" className="flex-shrink-0">
                  <div className="relative h-80 w-56 overflow-hidden rounded-lg bg-gray-200">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <p className="mt-2 text-xl font-semibold text-gray-900">Streaming</p>
                        <p className="mt-1 text-sm text-gray-600">Video platforms</p>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Audio Hosting Category */}
                <Link href="/products?category=Audio Hosting" className="flex-shrink-0">
                  <div className="relative h-80 w-56 overflow-hidden rounded-lg bg-gray-200">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                        <p className="mt-2 text-xl font-semibold text-gray-900">Audio Hosting</p>
                        <p className="mt-1 text-sm text-gray-600">Music & podcasts</p>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Downloaders Category */}
                <Link href="/products?category=Downloaders" className="flex-shrink-0">
                  <div className="relative h-80 w-56 overflow-hidden rounded-lg bg-gray-200">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                        <p className="mt-2 text-xl font-semibold text-gray-900">Downloaders</p>
                        <p className="mt-1 text-sm text-gray-600">Download tools</p>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* AI Category */}
                <Link href="/products?category=Artificial Intelligence" className="flex-shrink-0">
                  <div className="relative h-80 w-56 overflow-hidden rounded-lg bg-gray-200">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <p className="mt-2 text-xl font-semibold text-gray-900">Artificial Intelligence</p>
                        <p className="mt-1 text-sm text-gray-600">AI tools</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* New Releases */}
        <section aria-labelledby="new-releases-heading" className="bg-white">
          <div className="py-16 sm:py-24 lg:mx-auto lg:max-w-7xl lg:px-8 lg:py-32">
            <div className="flex items-center justify-between px-4 sm:px-6 lg:px-0">
              <h2 id="new-releases-heading" className="text-2xl font-bold tracking-tight text-gray-900">
                New Releases
              </h2>
              <Link href="/products" className="hidden text-sm font-semibold text-indigo-600 hover:text-indigo-500 sm:block">
                See everything
                <span aria-hidden="true"> &rarr;</span>
              </Link>
            </div>

            <div className="relative mt-8">
              <div className="relative w-full overflow-x-auto">
                <ul className="mx-4 inline-flex space-x-8 sm:mx-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-x-8 lg:space-x-0">
                  {trendingProducts.map((product) => (
                    <li key={product.id} className="inline-flex w-64 flex-col text-center lg:w-auto">
                      <div className="group relative">
                        <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-md border border-gray-200 flex items-center justify-center">
                          <div className="w-1/2 h-1/2 relative">
                            <BrandLogo slug={product.slug} className="h-full w-full" />
                          </div>
                        </div>
                        <div className="mt-6">
                          <p className="text-sm text-gray-500">{product.category}</p>
                          <h3 className="mt-1 font-semibold text-gray-900">
                            <Link href={`/product/${product.slug}`}>
                              <span className="absolute inset-0" />
                              {product.name}
                            </Link>
                          </h3>
                          <p className="mt-1 text-gray-900">{product.price}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-12 px-4 sm:hidden">
              <Link href="/products" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
                See everything
                <span aria-hidden="true"> &rarr;</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Collections */}
        <section aria-labelledby="collections-heading" className="bg-gray-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl py-16 sm:py-24 lg:max-w-none lg:py-32">
              <h2 id="collections-heading" className="text-2xl font-bold text-gray-900">
                Collections
              </h2>

              <div className="mt-6 space-y-12 lg:grid lg:grid-cols-2 lg:gap-x-6 lg:space-y-0">
                <div className="group relative">
                  <div className="relative h-80 w-full overflow-hidden rounded-lg bg-gray-100 sm:aspect-h-1 sm:aspect-w-2 lg:aspect-h-1 lg:aspect-w-1 group-hover:opacity-75 sm:h-64">
                    <Image
                      src="/downloader.png"
                      alt="Downloaders Collection"
                      width={500}
                      height={500}
                      className="h-full w-full object-contain object-center p-8"
                    />
                  </div>
                  <h3 className="mt-6 text-base font-semibold text-gray-900">
                    <Link href="/products">
                      <span className="absolute inset-0" />
                      Downloaders
                    </Link>
                  </h3>
                </div>

                <div className="group relative">
                  <div className="relative h-80 w-full overflow-hidden rounded-lg bg-gray-100 sm:aspect-h-1 sm:aspect-w-2 lg:aspect-h-1 lg:aspect-w-1 group-hover:opacity-75 sm:h-64">
                    <Image
                      src="/artificial-intelligence.png"
                      alt="AI Collection"
                      width={500}
                      height={500}
                      className="h-full w-full object-contain object-center p-8"
                    />
                  </div>
                  <h3 className="mt-6 text-base font-semibold text-gray-900">
                    <Link href="/products">
                      <span className="absolute inset-0" />
                      Artificial Intelligence
                    </Link>
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sale and testimonials */}
        <div className="relative overflow-hidden">
          {/* Decorative background image and gradient */}
          <div aria-hidden="true" className="absolute inset-0">
            <div className="absolute inset-0 mx-auto max-w-7xl overflow-hidden xl:px-8">
              <Image
                src="https://tailwindui.com/plus/img/ecommerce-images/home-page-02-sale-full-width.jpg"
                alt=""
                width={1920}
                height={1080}
                className="h-full w-full object-cover object-center"
              />
            </div>
            <div className="absolute inset-0 bg-white bg-opacity-75" />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white" />
          </div>

          {/* Sale */}
          <section aria-labelledby="sale-heading" className="relative mx-auto flex max-w-7xl flex-col items-center px-4 pt-32 text-center sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:max-w-none">
              <h2 id="sale-heading" className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                Get 25% off during our one-time sale
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-xl text-gray-600">
                Most of our products are limited releases that won&apos;t come back. Get your favorite items while they&apos;re in stock.
              </p>
              <Link
                href="/products"
                className="mt-6 inline-block w-full rounded-md border border-transparent bg-gray-900 px-8 py-3 font-medium text-white hover:bg-gray-800 sm:w-auto"
              >
                Get access to our one-time sale
              </Link>
            </div>
          </section>

          {/* Testimonials */}
          <section aria-labelledby="testimonial-heading" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
            <div className="mx-auto max-w-2xl lg:max-w-none">
              <h2 id="testimonial-heading" className="text-2xl font-bold tracking-tight text-gray-900">
                What our customers are saying
              </h2>

              <div className="mt-16 space-y-16 lg:grid lg:grid-cols-3 lg:gap-x-8 lg:space-y-0">
                {testimonials.map((testimonial) => (
                  <blockquote key={testimonial.id} className="sm:flex lg:block">
                    <svg
                      width={24}
                      height={18}
                      viewBox="0 0 24 18"
                      aria-hidden="true"
                      className="flex-shrink-0 text-gray-300"
                    >
                      <path
                        d="M0 18h8.7v-5.555c-.024-3.906 1.113-6.841 2.892-9.68L6.452 0C3.188 2.644-.026 7.86 0 12.469V18zm12.408 0h8.7v-5.555C21.083 8.539 22.22 5.604 24 2.765L18.859 0c-3.263 2.644-6.476 7.86-6.451 12.469V18z"
                        fill="currentColor"
                      />
                    </svg>
                    <div className="mt-8 sm:ml-6 sm:mt-0 lg:ml-0 lg:mt-10">
                      <p className="text-lg text-gray-600">{testimonial.quote}</p>
                      <cite className="mt-4 block font-semibold not-italic text-gray-900">
                        {testimonial.author}, {testimonial.role}
                      </cite>
                    </div>
                  </blockquote>
                ))}
              </div>
            </div>
          </section>
        </div>



      </main>

      {/* Footer */}
      <footer aria-labelledby="footer-heading" className="bg-white">
        <h2 id="footer-heading" className="sr-only">
          Footer
        </h2>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="border-t border-gray-200 py-20">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
              {/* Logo section */}
              <div>
                <h3 className="text-lg font-bold text-gray-900">Premium Store</h3>
              </div>

              {/* Products section */}
              <div>
                <h3 className="text-sm font-medium text-gray-900">Products</h3>
                <ul role="list" className="mt-4 space-y-4">
                  <li>
                    <Link href="/products" className="text-sm text-gray-500 hover:text-gray-600">
                      All Products
                    </Link>
                  </li>
                  <li>
                    <Link href="/products" className="text-sm text-gray-500 hover:text-gray-600">
                      Downloaders
                    </Link>
                  </li>
                  <li>
                    <Link href="/products" className="text-sm text-gray-500 hover:text-gray-600">
                      Artificial Intelligence
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Company section */}
              <div>
                <h3 className="text-sm font-medium text-gray-900">Company</h3>
                <ul role="list" className="mt-4 space-y-4">
                  <li>
                    <a href="#" className="text-sm text-gray-500 hover:text-gray-600">
                      Terms
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-gray-500 hover:text-gray-600">
                      Privacy
                    </a>
                  </li>
                </ul>
              </div>

              {/* Customer Service section */}
              <div>
                <h3 className="text-sm font-medium text-gray-900">Customer Service</h3>
                <ul role="list" className="mt-4 space-y-4">
                  <li>
                    <a href="#" className="text-sm text-gray-500 hover:text-gray-600">
                      Returns
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-gray-500 hover:text-gray-600">
                      FAQ
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Newsletter section */}
            <div className="mt-12 border-t border-gray-200 pt-8">
              <div className="lg:flex lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Sign up for our newsletter</h3>
                  <p className="mt-2 text-sm text-gray-500">The latest deals and savings, sent to your inbox weekly.</p>
                </div>
                <form className="mt-4 sm:flex sm:max-w-md lg:mt-0">
                  <label htmlFor="email-address" className="sr-only">
                    Email address
                  </label>
                  <input
                    type="email"
                    name="email-address"
                    id="email-address"
                    autoComplete="email"
                    required
                    className="w-full min-w-0 appearance-none rounded-md border border-gray-300 bg-white px-4 py-2 text-base text-gray-900 placeholder-gray-500 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Enter your email"
                  />
                  <div className="mt-3 rounded-md sm:ml-3 sm:mt-0 sm:flex-shrink-0">
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      Sign up
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 py-8">
            <p className="text-center text-sm text-gray-500">&copy; 2024 Premium Store. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}