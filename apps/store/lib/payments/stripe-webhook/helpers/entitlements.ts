import type { CheckoutSessionRecord } from "@/lib/checkout";
import { getMetadataString } from "@/lib/metadata/metadata-access";

type Metadata = Record<string, unknown>;

function normalizeEntitlementList(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return Array.from(
      new Set(
        raw
          .map((entry) => String(entry ?? "").trim())
          .filter((entry) => entry.length > 0),
      ),
    );
  }

  if (typeof raw === "string") {
    return Array.from(
      new Set(
        raw
          .split(/[,\n]/g)
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0),
      ),
    );
  }

  return [];
}

function resolveEntitlementsFromMetadata(metadata?: Metadata | null): string[] {
  if (!metadata) {
    return [];
  }

  const resolved = normalizeEntitlementList(
    metadata.license_entitlements_resolved ?? metadata.licenseEntitlementsResolved,
  );
  if (resolved.length > 0) {
    return resolved;
  }

  return normalizeEntitlementList(metadata.license_entitlements ?? metadata.licenseEntitlements);
}

export function resolveCheckoutEntitlements(sessionRecord: CheckoutSessionRecord | null): string[] {
  if (!sessionRecord) {
    return [];
  }

  const metadata = sessionRecord.metadata as Metadata | null | undefined;
  const entitlements = resolveEntitlementsFromMetadata(metadata);
  if (entitlements.length > 0) {
    return entitlements;
  }

  return sessionRecord.offerId ? [sessionRecord.offerId] : [];
}

export function resolveCheckoutCustomerEmail(sessionRecord: CheckoutSessionRecord | null): string | null {
  if (!sessionRecord) {
    return null;
  }

  const metadata = sessionRecord.metadata as Metadata | null | undefined;
  return (
    sessionRecord.customerEmail ??
    getMetadataString(metadata, "customer_email") ??
    getMetadataString(metadata, "receipt_email") ??
    null
  );
}
