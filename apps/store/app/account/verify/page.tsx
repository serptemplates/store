import VerifyTokenClient from "@/components/account/VerifyTokenClient";

export const dynamic = "force-dynamic";

type SearchParamsPromise = Promise<Record<string, string | string[]>>;

export default async function AccountVerifyPage({
  searchParams,
}: {
  searchParams?: SearchParamsPromise;
}) {
  const params: Record<string, string | string[]> =
    (searchParams ? await searchParams : undefined) ?? {};
  const tokenParam = params?.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] ?? null : tokenParam ?? null;

  return <VerifyTokenClient token={token} />;
}
