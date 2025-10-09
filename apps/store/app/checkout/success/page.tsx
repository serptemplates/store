"use client";

import { Suspense, useEffect, useState } from "react";
import { CheckCircle, Download, Mail, ArrowRight, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@repo/ui";
import { ConversionTracking } from "./tracking";
import { useSearchParams } from "next/navigation";
import { processCheckoutSession } from "./actions";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const source = searchParams.get("source");
  const paypalOrderId = searchParams.get("order_id");

  const isStripeCheckout = Boolean(sessionId);
  const isPayPalCheckout = !sessionId && source === "paypal" && Boolean(paypalOrderId);
  const isExternalCheckout = !isStripeCheckout && !isPayPalCheckout;

  const [processing, setProcessing] = useState(isStripeCheckout);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setProcessing(false);
      return;
    }

    // Process the checkout session to ensure order and license are created
    // This is especially important in development where webhooks may not be configured
    processCheckoutSession(sessionId)
      .then((result) => {
        if (!result.success) {
          console.warn("Failed to process checkout:", result.message);
        }
      })
      .catch((err) => {
        console.error("Error processing checkout:", err);
        setError(
          "There was an issue processing your order. Please contact support if you don't receive your license key.",
        );
      })
      .finally(() => {
        setProcessing(false);
      });
  }, [sessionId]);

  const orderReference = sessionId ?? paypalOrderId ?? undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <ConversionTracking />
      <div className="max-w-2xl w-full">
        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          {/* Processing indicator */}
          {processing && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <p className="text-sm text-blue-800">Processing your order and generating license key...</p>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">{error}</p>
            </div>
          )}

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
            {isExternalCheckout
              ? "Thanks! We're finishing up your order."
              : "Thank You for Your Purchase!"}
          </h1>

          <p className="text-center text-gray-600 mb-8">
            {isExternalCheckout
              ? "We received your payment via our secure partner checkout. Look out for an email with download instructions and account options shortly."
              : isPayPalCheckout
                ? "Your PayPal order is confirmed. We'll email your receipt and login instructions to the address linked to your PayPal account."
                : "Your order has been successfully processed and you should receive a confirmation email shortly."}
          </p>

          {/* Order Details */}
          {orderReference && (
            <div className="bg-gray-50 rounded-lg p-4 mb-8">
              <p className="text-sm text-gray-500 mb-1">Order Reference</p>
              <p className="font-mono text-sm text-gray-700 break-all">{orderReference}</p>
            </div>
          )}

          {/* Next Steps */}
          <div className="space-y-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900">What happens next?</h2>

            <div className="space-y-4">
              {isExternalCheckout ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 rounded-full p-2 mt-0.5">
                      <Mail className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Watch for a follow-up email</p>
                      <p className="text-sm text-gray-600">
                        Our team is preparing your download link and account instructions. They&apos;ll arrive in the inbox you used for payment within a few minutes.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 rounded-full p-2 mt-0.5">
                      <Download className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Need instant access?</p>
                      <p className="text-sm text-gray-600">
                        Reply to the receipt email or reach out to support and we&apos;ll fast-track your access.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 rounded-full p-2 mt-0.5">
                      <ArrowRight className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Stay in touch</p>
                      <p className="text-sm text-gray-600">
                        If you don&apos;t see anything within 10 minutes, check spam or let us know so we can resend your access.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 rounded-full p-2 mt-0.5">
                      <Mail className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Check your inbox</p>
                      <p className="text-sm text-gray-600">
                        We&apos;ve sent your receipt and a 6-digit verification code to the email you used at checkout.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 rounded-full p-2 mt-0.5">
                      <Download className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Verify your email</p>
                      <p className="text-sm text-gray-600">
                        Enter the code (or click the link) to unlock your account dashboard and license keys.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 rounded-full p-2 mt-0.5">
                      <ArrowRight className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Access your downloads</p>
                      <p className="text-sm text-gray-600">
                        Once verified, head to your account to grab your purchase, license key, and onboarding guides.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            {isExternalCheckout ? (
              <>
                <Button asChild className="flex-1">
                  <Link href="/support">
                    Contact Support
                  </Link>
                </Button>

                <Button asChild variant="outline" className="flex-1">
                  <Link href="/">
                    <Home className="w-4 h-4 mr-2" />
                    Back to Home
                  </Link>
                </Button>
              </>
            ) : (
              <>
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
              </>
            )}
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
