import { NextRequest, NextResponse } from 'next/server'
import { getStripeClient } from '@/lib/stripe'
import { getProductBySlug } from '@/lib/products'

export async function POST(request: NextRequest) {
  try {
    const { productId, quantity = 1 } = await request.json()

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const product = await getProductBySlug(productId)
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const stripe = getStripeClient()

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'

    // Use Stripe price ID if available, otherwise create price data
    const lineItems = product.stripePriceId
      ? [
          {
            price: product.stripePriceId,
            quantity,
          },
        ]
      : [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: product.name,
                description: product.tagline || product.description,
                images: product.featuredImage ? [product.featuredImage] : [],
              },
              unit_amount: Math.round(parseFloat(product.price.replace('$', '')) * 100),
            },
            quantity,
          },
        ]

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/product/${productId}`,
      metadata: {
        productId: product.slug,
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Error creating checkout session' },
      { status: 500 }
    )
  }
}