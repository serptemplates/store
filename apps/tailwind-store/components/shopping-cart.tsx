'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/20/solid'
import { useCart } from '@/contexts/cart-context'
import Image from 'next/image'
import Link from 'next/link'

interface ShoppingCartProps {
  open: boolean
  setOpen: (open: boolean) => void
}

export default function ShoppingCart({ open, setOpen }: ShoppingCartProps) {
  const { items, removeFromCart, updateQuantity, getTotalPrice } = useCart()

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={setOpen}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-500 sm:duration-700"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-500 sm:duration-700"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col bg-white shadow-xl">
                    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                      <div className="flex items-start justify-between">
                        <Dialog.Title className="text-lg font-medium text-gray-900">Shopping cart</Dialog.Title>
                        <div className="ml-3 flex h-7 items-center">
                          <button
                            type="button"
                            className="relative -m-2 p-2 text-gray-400 hover:text-gray-500"
                            onClick={() => setOpen(false)}
                          >
                            <span className="absolute -inset-0.5" />
                            <span className="sr-only">Close panel</span>
                            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-8">
                        <div className="flow-root">
                          {items.length === 0 ? (
                            <div className="text-center py-12">
                              <svg
                                className="mx-auto h-12 w-12 text-gray-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                                />
                              </svg>
                              <h3 className="mt-2 text-sm font-medium text-gray-900">Your cart is empty</h3>
                              <p className="mt-1 text-sm text-gray-500">Start adding some items to your cart!</p>
                              <div className="mt-6">
                                <button
                                  type="button"
                                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                                  onClick={() => setOpen(false)}
                                >
                                  Continue Shopping
                                  <span aria-hidden="true"> &rarr;</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <ul role="list" className="-my-6 divide-y divide-gray-200">
                              {items.map((product) => (
                                <li key={product.id} className="flex py-6">
                                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                                    <Image
                                      src={product.image}
                                      alt={product.name}
                                      width={96}
                                      height={96}
                                      className="h-full w-full object-cover object-center"
                                    />
                                  </div>

                                  <div className="ml-4 flex flex-1 flex-col">
                                    <div>
                                      <div className="flex justify-between text-base font-medium text-gray-900">
                                        <h3>
                                          <Link href={`/product/${product.id}`}>{product.name}</Link>
                                        </h3>
                                        <p className="ml-4">{product.price}</p>
                                      </div>
                                      <p className="mt-1 text-sm text-gray-500">Digital Download</p>
                                    </div>
                                    <div className="flex flex-1 items-end justify-between text-sm">
                                      <div className="flex items-center space-x-2">
                                        <label htmlFor={`quantity-${product.id}`} className="sr-only">
                                          Quantity, {product.name}
                                        </label>
                                        <select
                                          id={`quantity-${product.id}`}
                                          name={`quantity-${product.id}`}
                                          value={product.quantity}
                                          onChange={(e) => updateQuantity(product.id, parseInt(e.target.value))}
                                          className="rounded-md border border-gray-300 text-left text-base font-medium text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                                        >
                                          {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                                            <option key={num} value={num}>
                                              {num}
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      <div className="flex">
                                        <button
                                          type="button"
                                          className="font-medium text-indigo-600 hover:text-indigo-500"
                                          onClick={() => removeFromCart(product.id)}
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>

                    {items.length > 0 && (
                      <div className="border-t border-gray-200 px-4 py-6 sm:px-6">
                        <div className="flex justify-between my-2">
                          <dt className="flex items-center text-sm text-gray-600">
                            <span>Subtotal</span>
                          </dt>
                          <dd className="text-sm font-medium text-gray-900">${getTotalPrice().toFixed(2)}</dd>
                        </div>
                        <div className="flex justify-between my-2">
                          <dt className="flex items-center text-sm text-gray-600">
                            <span>Shipping</span>
                          </dt>
                          <dd className="text-sm font-medium text-gray-900">FREE</dd>
                        </div>
                        <div className="flex justify-between my-2">
                          <dt className="flex items-center text-sm text-gray-600">
                            <span>Taxes</span>
                          </dt>
                          <dd className="text-sm font-medium text-gray-900">$0.00</dd>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                          <dt className="text-base font-medium text-gray-900">Total</dt>
                          <dd className="text-base font-medium text-gray-900">${getTotalPrice().toFixed(2)}</dd>
                        </div>

                        <div className="mt-6">
                          <button
                            type="button"
                            className="w-full rounded-md border border-transparent bg-indigo-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50"
                          >
                            Checkout
                          </button>
                        </div>

                        <div className="mt-6 flex justify-center text-center text-sm text-gray-500">
                          <p>
                            or{' '}
                            <button
                              type="button"
                              className="font-medium text-indigo-600 hover:text-indigo-500"
                              onClick={() => setOpen(false)}
                            >
                              Continue Shopping
                              <span aria-hidden="true"> &rarr;</span>
                            </button>
                          </p>
                        </div>

                        {/* Trust badges */}
                        <div className="mt-6 border-t border-gray-200 pt-6">
                          <div className="flex items-center justify-center space-x-2">
                            <CheckIcon className="h-5 w-5 text-green-500" aria-hidden="true" />
                            <span className="text-sm text-gray-500">Secure checkout</span>
                          </div>
                          <div className="mt-2 flex items-center justify-center space-x-2">
                            <CheckIcon className="h-5 w-5 text-green-500" aria-hidden="true" />
                            <span className="text-sm text-gray-500">Instant digital delivery</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}