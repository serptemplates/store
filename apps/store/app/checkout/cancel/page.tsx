import { CheckoutCancelContent } from "./render"

type PageSearchParams = {
  product?: string | string[]
}

function getProductParam(searchParams: PageSearchParams) {
  const value = searchParams?.product
  if (!value) return undefined
  return Array.isArray(value) ? value[0] : value
}

export default function CheckoutCancelPage({ searchParams }: { searchParams: PageSearchParams }) {
  const product = getProductParam(searchParams)

  return <CheckoutCancelContent product={product} />
}

export const dynamic = "force-dynamic"
