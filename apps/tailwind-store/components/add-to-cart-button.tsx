'use client'

import { useCart } from '@/contexts/cart-context'

interface AddToCartButtonProps {
  product: {
    id: string
    name: string
    price: string
    image: string
  }
}

export default function AddToCartButton({ product }: AddToCartButtonProps) {
  const { addToCart } = useCart()

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
    })
  }

  return (
    <button
      type="button"
      onClick={handleAddToCart}
      className="mt-10 flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
    >
      Add to bag
    </button>
  )
}