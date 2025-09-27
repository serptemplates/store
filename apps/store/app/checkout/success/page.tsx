"use client";

import { Suspense } from "react";
import { CheckCircle, Download, Mail, ArrowRight, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@repo/ui";
import { ConversionTracking } from "./tracking";
import { useSearchParams } from "next/navigation";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <ConversionTracking />
      <div className="max-w-2xl w-full">
        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-green-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <div className="relative bg-green-100 rounded-full p-4">
                <CheckCircle className="w-16 h-16 text-green-600" />
              </div>
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
            Thank You for Your Purchase!
          </h1>

          <p className="text-center text-gray-600 mb-8">
            Your order has been successfully processed and you should receive a confirmation email shortly.
          </p>

          {/* Order Details */}
          {sessionId && (
            <div className="bg-gray-50 rounded-lg p-4 mb-8">
              <p className="text-sm text-gray-500 mb-1">Order Reference</p>
              <p className="font-mono text-sm text-gray-700 break-all">{sessionId}</p>
            </div>
          )}

          {/* Next Steps */}
          <div className="space-y-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900">What happens next?</h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 rounded-full p-2 mt-0.5">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Check your email</p>
                  <p className="text-sm text-gray-600">
                    We&apos;ve sent your receipt and access details to your email address
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-blue-100 rounded-full p-2 mt-0.5">
                  <Download className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Access your purchase</p>
                  <p className="text-sm text-gray-600">
                    Follow the instructions in your email to download or access your product
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-blue-100 rounded-full p-2 mt-0.5">
                  <ArrowRight className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Get started</p>
                  <p className="text-sm text-gray-600">
                    Begin using your new product right away with our quick start guide
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild className="flex-1">
              <Link href="/account">
                View Your Orders
              </Link>
            </Button>

            <Button asChild variant="outline" className="flex-1">
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Need help? {" "}
            <Link href="/support" className="text-blue-600 hover:text-blue-700 font-medium">
              Contact Support
            </Link>
            {" "} or check our {" "}
            <Link href="/faq" className="text-blue-600 hover:text-blue-700 font-medium">
              FAQ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading your order details...</p>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}