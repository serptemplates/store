import type { StripeMode } from "@/lib/payments/stripe-environment";

const CROSS_SELL_ENV_BASES = [
  "STRIPE_CROSS_SELL_DOWNLOADERS_PRODUCT_ID",
  "STRIPE_CROSS_SELL_ALL_BUNDLE_PRODUCT_ID",
  "STRIPE_CROSS_SELL_ADULT_BUNDLE_PRODUCT_ID",
] as const;

export const BUNDLE_PRODUCT_IDS = ["prod_TadNFo3sxzkGYb"] as const;

type ResolveDownloaderCrossSellTargetInput = {
  env: Record<string, string | undefined>;
  accountAlias: string;
  mode: StripeMode;
};

function buildEnvCandidates(base: string, aliasToken: string, mode: StripeMode): string[] {
  const suffix = mode === "live" ? "LIVE" : "TEST";
  return [
    `${base}__${aliasToken}__${suffix}`,
    `${base}__${aliasToken}`,
    `${base}_${suffix}`,
    base,
  ];
}

function normalizeProductId(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function isBundleCrossSellProductId(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return BUNDLE_PRODUCT_IDS.includes(value as (typeof BUNDLE_PRODUCT_IDS)[number]);
}

export function resolveDownloaderCrossSellTarget({
  env,
  accountAlias,
  mode,
}: ResolveDownloaderCrossSellTargetInput): string | undefined {
  const aliasToken = accountAlias.replace(/[^a-z0-9]/gi, "_").toUpperCase();

  for (const base of CROSS_SELL_ENV_BASES) {
    const candidates = buildEnvCandidates(base, aliasToken, mode);
    for (const candidate of candidates) {
      const target = normalizeProductId(env[candidate]);
      if (!target) {
        continue;
      }

      if (isBundleCrossSellProductId(target)) {
        return undefined;
      }

      return target;
    }
  }

  return undefined;
}
