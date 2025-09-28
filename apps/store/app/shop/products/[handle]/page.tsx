import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getProductByHandle } from "@/lib/products-data"
import { ProductPageView } from "@/components/product/pages/ProductPageView"

type ProductPageParams = {
  handle: string
}

interface ProductPageProps {
  params: Promise<ProductPageParams>
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { handle } = await params
  const product = await getProductByHandle(handle)
  if (!product) return {}

  return {
    title: product.metadata?.seo_title || `${product.title} - SERP Store`,
    description: product.metadata?.seo_description || product.description,
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { handle } = await params
  const product = await getProductByHandle(handle)

  if (!product) {
    notFound()
  }

  return <ProductPageView handle={handle} product={product} />
}
