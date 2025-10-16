import priceManifest from "@/data/prices/manifest.json";

type RawManifestEntry = {
  unit_amount: number;
  currency: string;
  compare_at_amount?: number;
};

type RawManifest = Record<string, RawManifestEntry>;

const manifest = priceManifest as RawManifest;

export type PriceManifestEntry = {
  id: string;
  unitAmount: number;
  currency: string;
  compareAtAmount?: number;
};

function normaliseCurrency(value?: string): string {
  return (value ?? "USD").toUpperCase();
}

export function findPriceEntry(
  ...candidateIds: Array<string | null | undefined>
): PriceManifestEntry | undefined {
  for (const candidate of candidateIds) {
    if (!candidate) {
      continue;
    }
    const raw = manifest[candidate];
    if (!raw) {
      continue;
    }

    return {
      id: candidate,
      unitAmount: raw.unit_amount,
      currency: normaliseCurrency(raw.currency),
      compareAtAmount: raw.compare_at_amount,
    };
  }

  return undefined;
}

export function formatAmountFromCents(
  unitAmount: number,
  currency: string,
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: normaliseCurrency(currency),
  }).format(unitAmount / 100);
}

export function formatEntry(entry: PriceManifestEntry): string {
  return formatAmountFromCents(entry.unitAmount, entry.currency);
}
