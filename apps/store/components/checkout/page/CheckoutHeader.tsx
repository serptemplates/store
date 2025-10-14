interface CheckoutHeaderProps {
  productName?: string
}

export function CheckoutHeader({ productName }: CheckoutHeaderProps) {
  return (
    <div className="mb-4 sm:mb-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Checkout</h1>
      {productName ? <p className="text-sm sm:text-base text-gray-600 mt-1">{productName}</p> : null}
    </div>
  )
}
