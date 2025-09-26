import { getProducts } from '@/lib/products'
import ProductsClient from '@/components/products-client'

interface SearchParams {
  category?: string
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const products = await getProducts()

  return <ProductsClient products={products} category={searchParams.category} />
}