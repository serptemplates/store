import { CheckoutCancelContent } from "./render"

type PageSearchParams = Record<string, string | string[] | undefined>

function getProductParam(searchParams: PageSearchParams) {
  const value = searchParams?.product
  if (!value) return undefined
  return Array.isArray(value) ? value[0] : value
}

export default async function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>
}) {
  const params = await searchParams
  const product = getProductParam(params)

  return <CheckoutCancelContent product={product} />
}

export const dynamic = "force-dynamic"
