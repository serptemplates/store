import VerifyTokenClient from "@/components/account/VerifyTokenClient";

interface VerifyPageProps {
  searchParams?: Record<string, string | string[]>;
}

export default function AccountVerifyPage({ searchParams }: VerifyPageProps) {
  const tokenParam = searchParams?.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] ?? null : tokenParam ?? null;

  return <VerifyTokenClient token={token} />;
}
