import {
  type LicenseProviderPurchase,
} from "@/lib/contracts/license-provider";

type LicenseProviderStatus = LicenseProviderPurchase["status"];

export function normaliseKey(data: Record<string, unknown>): string | null {
  if (typeof data.licenseKey === "string" && data.licenseKey.length > 0) {
    return data.licenseKey;
  }
  if (typeof data.key === "string" && data.key.length > 0) {
    return data.key;
  }
  return null;
}

export function normaliseStatus(value?: string | null): LicenseProviderStatus {
  if (!value) {
    return "completed";
  }

  const normalised = value.toLowerCase();
  const allowed: LicenseProviderStatus[] = ["completed", "failed", "refunded", "cancelled"];

  return allowed.includes(normalised as LicenseProviderStatus)
    ? (normalised as LicenseProviderStatus)
    : "completed";
}

export function normaliseExpiresAt(value?: string | number | null): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const direct = Number(value);
    if (!Number.isNaN(direct)) {
      return direct;
    }

    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return Math.floor(parsed / 1000);
    }
  }

  return null;
}

