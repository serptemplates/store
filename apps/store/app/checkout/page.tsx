import { redirect } from "next/navigation";

type CheckoutSearchParams = {
  [key: string]: string | string[] | undefined;
  product?: string | string[];
};

function normalizeProductParam(value: string | string[] | undefined): string | null {
  if (!value) {
    return null;
  }

  const first = Array.isArray(value) ? value[0] : value;
  if (!first) {
    return null;
  }

  const trimmed = first.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const dynamic = "force-static";

export default async function CheckoutRedirectPage({ searchParams }: { searchParams: Promise<CheckoutSearchParams> }) {
  const params = await searchParams;
  const productSlug = normalizeProductParam(params?.product);

  if (productSlug) {
    redirect(`/${productSlug}`);
  }

  redirect("/");
}
