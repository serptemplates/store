import { PayPalCheckoutButton } from "@/components/paypal-button";

export interface ProductInfoSectionProps {
  title: string;
  description?: string;
  displayPrice?: string | null;
  originalPrice?: string | null;
  priceLabel?: string | null;
  onCheckout: () => void;
  checkoutCtaLabel?: string;
  isCheckoutLoading: boolean;
  showWaitlist: boolean;
  onWaitlistClick?: () => void;
  payPalProps?: {
    offerId: string;
    price: string;
    affiliateId?: string;
    metadata?: Record<string, string>;
    buttonText?: string;
  } | null;
  benefits?: string[];
  features?: string[];
  githubUrl?: string;
}

export function ProductInfoSection({
  title,
  description,
  displayPrice,
  originalPrice,
  priceLabel,
  onCheckout,
  checkoutCtaLabel = "Buy with Card",
  isCheckoutLoading,
  showWaitlist,
  onWaitlistClick,
  payPalProps,
  benefits = [],
  features = [],
  githubUrl,
}: ProductInfoSectionProps) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>

      {displayPrice && (
        <div className="mb-6">
          <p className="text-3xl font-semibold text-gray-900">{displayPrice}</p>
          {originalPrice && <p className="text-lg text-gray-500 line-through">{originalPrice}</p>}
          {priceLabel && <p className="text-sm text-gray-500">{priceLabel}</p>}
        </div>
      )}

      {description && (
        <div className="prose prose-gray mb-6">
          <p>{description}</p>
        </div>
      )}

      <div className="space-y-3 mb-8">
        {showWaitlist ? (
          <button
            onClick={onWaitlistClick}
            className="block w-full bg-purple-600 text-white text-center py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition"
          >
            Join Waitlist
          </button>
        ) : (
          <button
            onClick={onCheckout}
            disabled={isCheckoutLoading}
            className="block w-full bg-blue-600 text-white text-center py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isCheckoutLoading ? "Processing…" : checkoutCtaLabel}
          </button>
        )}

        {payPalProps && !showWaitlist && process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID && (
          <PayPalCheckoutButton
            offerId={payPalProps.offerId}
            price={payPalProps.price}
            affiliateId={payPalProps.affiliateId}
            metadata={payPalProps.metadata}
            buttonText={payPalProps.buttonText || "Pay with PayPal"}
            className="w-full"
          />
        )}

        <button className="w-full p-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {features.length > 0 && (
        <div className="border-t pt-6 mt-6">
          <h3 className="font-semibold text-lg mb-4">Features</h3>
          <ul className="space-y-2">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {benefits.length > 0 && (
        <div className="border-t pt-6 mt-6">
          <h3 className="font-semibold text-lg mb-4">What You Get</h3>
          <ul className="space-y-2">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t pt-6 mt-6">
        <div className="flex items-center gap-4 flex-wrap text-sm text-gray-600">
          <TrustBadge iconPath="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" label="Secure Checkout" />
          <TrustBadge iconPath="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" label="Safe Payment" />
          <TrustBadge iconPath="M13 10V3L4 14h7v7l9-11h-7z" label="Instant Access" />
        </div>
      </div>

      {githubUrl && (
        <div className="mt-6">
          <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            View on GitHub
          </a>
        </div>
      )}
    </div>
  );
}

interface TrustBadgeProps {
  iconPath: string;
  label: string;
}

function TrustBadge({ iconPath, label }: TrustBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
      </svg>
      {label}
    </div>
  );
}
