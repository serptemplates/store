"use client"

import { useEffect } from "react"
import Link from "next/link"

type CheckoutCancelContentProps = {
  product?: string
}

export function CheckoutCancelContent({ product }: CheckoutCancelContentProps) {
  useEffect(() => {
    console.log("Checkout cancelled", { product })
  }, [product])

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="mb-6">
            <svg
              className="mx-auto h-16 w-16 text-yellow-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Checkout Cancelled</h1>

          <p className="text-gray-600 mb-8">
            Your checkout was cancelled. No charges were made to your payment method.
          </p>

          <div className="space-y-4">
            <Link
              href={{
                pathname: "/checkout",
                query: product ? { product } : undefined,
              }}
              className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Return to Checkout
            </Link>

            <Link
              href="/"
              className="block w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Browse Products
            </Link>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Need help? Contact our support team at{" "}
              <a href="mailto:support@example.com" className="text-blue-600 hover:underline">
                support@example.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
