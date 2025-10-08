"use client";

import { useEffect, useRef, useState } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useRouter } from "next/navigation";

interface PayPalButtonProps {
  offerId: string;
  price: string;
  quantity?: number;
  className?: string;
  affiliateId?: string;
  metadata?: Record<string, string>;
  customer?: {
    email?: string;
    name?: string;
  };
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export function PayPalButton({
  offerId,
  price,
  quantity = 1,
  className = "",
  affiliateId,
  metadata,
  customer,
  onSuccess,
  onError,
}: PayPalButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get PayPal client ID from environment
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  if (!clientId) {
    return (
      <div className="text-sm text-gray-500">
        PayPal is not configured
      </div>
    );
  }

  const createOrder = async () => {
    try {
      setLoading(true);
      setError(null);

      // Extract coupon code from metadata if present
      const couponCode = metadata?.couponCode;

      const response = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offerId,
          quantity,
          affiliateId,
          metadata,
          customer,
          couponCode,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create PayPal order");
      }

      const data = await response.json();
      return data.orderId;
    } catch (err) {
      console.error("Error creating PayPal order:", err);
      setError("Failed to create PayPal order");
      if (onError) onError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const onApprove = async (data: any) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: data.orderID,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to capture PayPal payment");
      }

      const result = await response.json();

      if (onSuccess) {
        onSuccess(result);
      }

      // Redirect to success page
      router.push(`/checkout/success?source=paypal&order_id=${data.orderID}`);
    } catch (err) {
      console.error("Error capturing PayPal payment:", err);
      setError("Failed to complete PayPal payment");
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  };

  const onErrorHandler = (err: any) => {
    console.error("PayPal error:", err);
    setError("PayPal payment failed");
    if (onError) onError(err);
  };

  const onCancel = () => {
    console.log("PayPal payment cancelled");
    setError("Payment cancelled");
  };

  // Calculate amount for display
  const amount = parseFloat(price.replace(/[^0-9.]/g, "")) * quantity;

  return (
    <div className={className}>
      <PayPalScriptProvider
        options={{
          clientId: clientId,
          currency: "USD",
          intent: "capture",
        } as any}
      >
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
              <div className="text-sm">Processing...</div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <PayPalButtons
            style={{
              layout: "vertical",
              color: "gold",
              shape: "rect",
              label: "paypal",
            }}
            disabled={loading}
            createOrder={createOrder}
            onApprove={onApprove}
            onError={onErrorHandler}
            onCancel={onCancel}
            fundingSource="paypal"
          />

          <div className="mt-2 text-center">
            <p className="text-xs text-gray-500">
              Secure payment via PayPal
            </p>
            <p className="text-xs text-gray-500">
              Total: ${amount.toFixed(2)}
            </p>
          </div>
        </div>
      </PayPalScriptProvider>
    </div>
  );
}

// Standalone PayPal checkout button (no provider needed)
export function PayPalCheckoutButton({
  offerId,
  price,
  quantity = 1,
  className = "w-full",
  buttonText = "Pay with PayPal",
  affiliateId,
  metadata,
  customer,
  disabled = false,
}: PayPalButtonProps & { buttonText?: string; disabled?: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handlePayPalCheckout = async () => {
    if (disabled || loading) {
      return;
    }

    try {
      setLoading(true);

      // Extract coupon code from metadata if present
      const couponCode = metadata?.couponCode;

      const response = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offerId,
          quantity,
          affiliateId,
          metadata,
          customer,
          couponCode,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create PayPal order");
      }

      const data = await response.json();

      // Find the approval URL from PayPal response
      const approvalUrl = data.links?.find(
        (link: any) => link.rel === "approve"
      )?.href;

      if (approvalUrl) {
        // Redirect to PayPal for payment
        window.location.href = approvalUrl;
      } else {
        throw new Error("No approval URL returned from PayPal");
      }
    } catch (error) {
      console.error("PayPal checkout error:", error);
      alert("Failed to start PayPal checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayPalCheckout}
      disabled={loading || disabled}
      className={`${className} group inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#FFC439] hover:bg-[#F5B800] px-8 text-base font-semibold text-black shadow-lg transition-all hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed`}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72c.07-.37.392-.634.77-.634h7.494c2.959 0 4.736 1.547 4.736 3.957 0 3.39-2.857 5.16-5.574 5.16H9.144l-.846 8.473a.666.666 0 0 1-.658.56h-.001l-3.563.1zm1.877-11.566h2.68c1.448 0 2.605-.626 2.605-2.157 0-.964-.641-1.56-1.764-1.56H9.724l-.771 3.717z" fill="#253B80"/>
            <path d="M18.99 7.842h-3.658a.641.641 0 0 0-.633.555l-1.328 7.042-.045.235h3.41c.325 0 .61-.237.658-.553l.348-2.23c.047-.316.333-.553.658-.553h.525c2.146 0 3.39-1.041 3.718-3.104.144-.9-.006-1.607-.416-2.057-.45-.49-1.25-.836-2.237-.836v.501zm.387 3.053c-.144.957-.867 1.598-1.777 1.598h-.452l.316-2.004a.395.395 0 0 1 .39-.335h.207c.54 0 1.05 0 1.312.308.157.184.205.459.004.433z" fill="#179BD7"/>
          </svg>
          {buttonText}
        </span>
      )}
    </button>
  );
}
