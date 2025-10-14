import type { PurchaseSummary } from "@/components/account/AccountDashboard";
import type { GhlLicenseRecord } from "@/lib/ghl-client";

function normalizeKey(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : null;
}

function normalizeOfferId(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || null;
}

function getOfferCandidates(license: GhlLicenseRecord): Set<string> {
  const candidates = new Set<string>();

  const hints = [
    license.offerId,
    license.tier,
    ...license.entitlements,
    license.sourceField,
  ];

  for (const hint of hints) {
    const normalised = normalizeOfferId(hint);

    if (normalised) {
      candidates.add(normalised);
    }
  }

  return candidates;
}

function offerMatches(license: GhlLicenseRecord, offerId: string | null): boolean {
  if (!offerId) {
    return false;
  }

  const normalizedOfferId = normalizeOfferId(offerId);
  if (!normalizedOfferId) {
    return false;
  }

  const candidates = getOfferCandidates(license);
  return candidates.has(normalizedOfferId);
}

function mergeLicenseData(
  purchase: PurchaseSummary,
  license: GhlLicenseRecord,
): PurchaseSummary {
  const updated: PurchaseSummary = { ...purchase };

  if (!updated.licenseKey) {
    updated.licenseKey = license.key;
  }

  if (!updated.licenseStatus) {
    updated.licenseStatus = license.action ?? license.tier ?? null;
  }

  if (!updated.licenseUrl && license.url) {
    updated.licenseUrl = license.url;
  }

  if (!updated.purchasedAt && license.issuedAt) {
    updated.purchasedAt = license.issuedAt;
  }

  return updated;
}

function buildFallbackPurchase(
  license: GhlLicenseRecord,
  index: number,
): PurchaseSummary {
  const offerLabel =
    license.offerId ??
    license.tier ??
    license.entitlements[0] ??
    "GHL License";

  const orderId =
    license.id ??
    `ghl:${index}:${license.offerId ?? license.key.slice(-8)}`;

  return {
    orderId,
    offerId: offerLabel,
    purchasedAt: license.issuedAt ?? null,
    amountFormatted: null,
    source: "ghl",
    licenseKey: license.key,
    licenseStatus: license.action ?? license.tier ?? null,
    licenseUrl: license.url ?? null,
  };
}

function dedupeLicenses(licenses: GhlLicenseRecord[]): GhlLicenseRecord[] {
  const map = new Map<string, GhlLicenseRecord>();

  for (const license of licenses) {
    const key = normalizeKey(license.key);

    if (!key) {
      continue;
    }

    const existing = map.get(key);

    if (!existing) {
      map.set(key, { ...license });
      continue;
    }

    // Merge entitlements
    const entitlements = new Set<string>([
      ...(existing.entitlements ?? []),
      ...(license.entitlements ?? []),
    ]);

    existing.entitlements = Array.from(entitlements).filter(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    );

    if (!existing.action && license.action) {
      existing.action = license.action;
    }

    if (!existing.tier && license.tier) {
      existing.tier = license.tier;
    }

    if (!existing.offerId && license.offerId) {
      existing.offerId = license.offerId;
    }

    if (!existing.url && license.url) {
      existing.url = license.url;
    }

    if (!existing.issuedAt && license.issuedAt) {
      existing.issuedAt = license.issuedAt;
    }
  }

  return Array.from(map.values());
}

export function mergePurchasesWithGhlLicenses(
  purchases: PurchaseSummary[],
  licenses: GhlLicenseRecord[],
): PurchaseSummary[] {
  const normalizedPurchases = purchases.map((purchase) => ({ ...purchase }));

  if (licenses.length === 0) {
    return collapsePurchasesByOffer(normalizedPurchases);
  }
  const existingKeys = new Set(
    normalizedPurchases
      .map((purchase) => normalizeKey(purchase.licenseKey))
      .filter((key): key is string => Boolean(key)),
  );

  const dedupedLicenses = dedupeLicenses(licenses);

  const remainingLicenses: GhlLicenseRecord[] = [];

  for (const license of dedupedLicenses) {
    const licenseKey = normalizeKey(license.key);

    if (licenseKey && existingKeys.has(licenseKey)) {
      // Update metadata if we already have this license key displayed
      const targetIndex = normalizedPurchases.findIndex(
        (purchase) => normalizeKey(purchase.licenseKey) === licenseKey,
      );

      if (targetIndex >= 0) {
        normalizedPurchases[targetIndex] = mergeLicenseData(
          normalizedPurchases[targetIndex],
          license,
        );
      }

      continue;
    }

    const matchIndex = normalizedPurchases.findIndex((purchase) =>
      offerMatches(license, purchase.offerId),
    );

    if (matchIndex >= 0) {
      normalizedPurchases[matchIndex] = mergeLicenseData(
        normalizedPurchases[matchIndex],
        license,
      );

      if (licenseKey) {
        existingKeys.add(licenseKey);
      }

      continue;
    }

    remainingLicenses.push(license);
  }

  remainingLicenses.forEach((license, index) => {
    normalizedPurchases.push(buildFallbackPurchase(license, index));
  });

  return collapsePurchasesByOffer(normalizedPurchases);
}

export type { PurchaseSummary, GhlLicenseRecord };

const INCOMPLETE_LICENSE_STATUSES = new Set([
  "pending",
  "awaiting",
  "unknown",
  "n/a",
  "na",
]);

function isMeaningfulStatus(status: string | null | undefined): boolean {
  if (!status) {
    return false;
  }

  const normalized = status.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  return !INCOMPLETE_LICENSE_STATUSES.has(normalized);
}

function mergeDuplicatePurchaseData(target: PurchaseSummary, incoming: PurchaseSummary): void {
  if (!target.licenseKey && incoming.licenseKey) {
    target.licenseKey = incoming.licenseKey;
  }

  const targetStatusMeaningful = isMeaningfulStatus(target.licenseStatus);
  const incomingStatusMeaningful = isMeaningfulStatus(incoming.licenseStatus);

  if (!targetStatusMeaningful && incomingStatusMeaningful) {
    target.licenseStatus = incoming.licenseStatus ?? null;
  }

  if (!target.licenseUrl && incoming.licenseUrl) {
    target.licenseUrl = incoming.licenseUrl;
  }

  if (!target.amountFormatted && incoming.amountFormatted) {
    target.amountFormatted = incoming.amountFormatted;
  }

  if (!target.purchasedAt && incoming.purchasedAt) {
    target.purchasedAt = incoming.purchasedAt;
  }

  if (
    (target.source === "unknown" || target.source === "ghl") &&
    incoming.source &&
    incoming.source !== "unknown"
  ) {
    target.source = incoming.source;
  }
}

function collapsePurchasesByOffer(purchases: PurchaseSummary[]): PurchaseSummary[] {
  if (purchases.length === 0) {
    return [];
  }

  const result: PurchaseSummary[] = [];
  const offerIndexMap = new Map<string, number>();

  purchases.forEach((purchase) => {
    const normalizedOfferId = normalizeOfferId(purchase.offerId);

    if (!normalizedOfferId) {
      result.push({ ...purchase });
      return;
    }

    const existingIndex = offerIndexMap.get(normalizedOfferId);

    if (existingIndex === undefined) {
      const copy = { ...purchase };
      result.push(copy);
      offerIndexMap.set(normalizedOfferId, result.length - 1);
      return;
    }

    const existing = result[existingIndex];
    const merged = { ...existing };
    mergeDuplicatePurchaseData(merged, purchase);
    result[existingIndex] = merged;
  });

  return result;
}
