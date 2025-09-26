import { getProductBySlug, getProducts } from '@/lib/products'
import { notFound } from 'next/navigation'
import ProductDetailsClient from '@/components/product-details-client'

export async function generateStaticParams() {
  const products = await getProducts()
  return products.map((product) => ({
    slug: product.slug,
  }))
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug)

  if (!product) {
    notFound()
  }

  return <ProductDetailsClient product={product} />
}