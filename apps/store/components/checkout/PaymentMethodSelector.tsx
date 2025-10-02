interface PaymentMethodSelectorProps {
  paymentMethod: "stripe" | "paypal"
  setPaymentMethod: (method: "stripe" | "paypal") => void
}

export function PaymentMethodSelector({ paymentMethod, setPaymentMethod }: PaymentMethodSelectorProps) {
  const paymentOptions = [
    {
      id: "stripe",
      name: "Credit/Debit Card",
      description: "Pay securely with your credit or debit card",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      badges: ["Visa", "Mastercard", "Amex", "Discover"],
    },
    {
      id: "paypal",
      name: "PayPal",
      description: "Pay with your PayPal account",
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.419a.77.77 0 0 1 .757-.653h7.122c2.355 0 4.186.57 5.445 1.693 1.188 1.062 1.79 2.603 1.79 4.582 0 .316-.013.634-.04.954-.27 3.266-2.14 5.56-5.726 5.56H11.78a.77.77 0 0 0-.757.653l-.912 5.787a.641.641 0 0 1-.633.542h-.402zm5.354-14.057c.158 0 .286.129.286.287 0 .158-.128.287-.286.287h-4.95a.287.287 0 0 0-.286.287v.957c0 .158.128.287.286.287h3.994c2.1 0 3.526 1.032 3.526 3.08 0 2.494-1.726 3.997-4.59 3.997H8.758a.77.77 0 0 0-.757.653l-.537 3.398a.641.641 0 0 1-.633.542H3.846a.641.641 0 0 1-.633-.74l.894-5.657a.77.77 0 0 1 .757-.653h5.115c1.507 0 2.46-.677 2.46-1.747 0-.588-.274-.95-.95-.95H7.496a.77.77 0 0 1-.757-.653l.287-1.817a.77.77 0 0 1 .757-.653h4.646z"/>
        </svg>
      ),
      badges: ["Fast", "Secure", "Buyer Protection"],
    },
  ]

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Payment Method</h2>

      <div className="space-y-3">
        {paymentOptions.map((option) => (
          <div
            key={option.id}
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              paymentMethod === option.id
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onClick={() => setPaymentMethod(option.id as "stripe" | "paypal")}
          >
            <div className="flex items-start">
              <input
                type="radio"
                name="paymentMethod"
                value={option.id}
                checked={paymentMethod === option.id}
                onChange={() => setPaymentMethod(option.id as "stripe" | "paypal")}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="mr-2 text-gray-700">{option.icon}</span>
                    <div>
                      <h3 className="font-medium text-gray-900">{option.name}</h3>
                      <p className="text-sm text-gray-600">{option.description}</p>
                    </div>
                  </div>
                </div>

                {/* Payment badges */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {option.badges.map((badge, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Security Notice */}
      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div className="ml-2">
            <p className="text-sm text-green-800 font-medium">Your payment information is secure</p>
            <p className="text-xs text-green-700 mt-1">
              We use industry-standard encryption to protect your payment details
            </p>
          </div>
        </div>
      </div>

      {/* Additional payment options info */}
      {paymentMethod === "stripe" && (
        <div className="mt-4 text-sm text-gray-600">
          <p className="flex items-center">
            <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Your card details will be processed securely by Stripe
          </p>
        </div>
      )}

      {paymentMethod === "paypal" && (
        <div className="mt-4 text-sm text-gray-600">
          <p className="flex items-center">
            <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            You&apos;ll be redirected to PayPal to complete your purchase
          </p>
        </div>
      )}
    </div>
  )
}