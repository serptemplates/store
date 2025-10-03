import VerifyTokenClient from "@/components/account/VerifyTokenClient";

export const dynamic = "force-dynamic";

type ResolvableSearchParams =
  | Record<string, string | string[]>
  | Promise<Record<string, string | string[]>>
  | undefined;

export default async function AccountVerifyPage({
  searchParams,
}: {
  searchParams?: ResolvableSearchParams;
}) {
  const params = (await Promise.resolve(searchParams)) ?? {};
  const tokenParam = params?.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] ?? null : tokenParam ?? null;

  return <VerifyTokenClient token={token} />;
}
