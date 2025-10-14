import type { GhlLicenseRecord } from "./types";

export function sanitizeOfferIdCandidate(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug || slug === "v2" || slug === "json" || slug === "payload") {
    return null;
  }

  return slug;
}

export function inferOfferIdFromFieldKey(fieldKey: string): string | null {
  if (typeof fieldKey !== "string") {
    return null;
  }

  const normalised = fieldKey.toLowerCase().replace(/^contact\./, "");

  const patterns = [
    /license[_-]?keys?_v\d*[_-]?(.+)/,
    /license[_-]?key[_-]?(.+)/,
  ];

  for (const pattern of patterns) {
    const match = normalised.match(pattern);
    const candidate = match?.[1] ?? null;

    if (candidate) {
      const slug = sanitizeOfferIdCandidate(candidate);
      if (slug) {
        return slug;
      }
    }
  }

  return null;
}

export function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }

  return null;
}

export function extractTemporalValue(...values: unknown[]): string | null {
  for (const value of values) {
    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      const ms = value > 1e12 ? value : value * 1000;
      const date = new Date(ms);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
      continue;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) {
        continue;
      }

      const numeric = Number(trimmed);
      if (!Number.isNaN(numeric)) {
        const ms = numeric > 1e12 ? numeric : numeric * 1000;
        const date = new Date(ms);
        if (!Number.isNaN(date.getTime())) {
          return date.toISOString();
        }
      }

      const parsed = Date.parse(trimmed);
      if (!Number.isNaN(parsed)) {
        return new Date(parsed).toISOString();
      }
    }
  }

  return null;
}

export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => {
            if (typeof item === "string") {
              return item.trim();
            }
            if (typeof item === "number" && Number.isFinite(item)) {
              return String(item);
            }
            return null;
          })
          .filter((item): item is string => Boolean(item && item.length > 0))
          .map((item) => sanitizeOfferIdCandidate(item) ?? item.toLowerCase()),
      ),
    );
  }

  if (typeof value === "string" && value.includes(",")) {
    return toStringArray(
      value
        .split(",")
        .map((segment) => segment.trim())
        .filter((segment) => segment.length > 0),
    );
  }

  return [];
}

export function isPotentialLicenseField(fieldKey: string, value: unknown): boolean {
  let keyMatches = false;
  if (typeof fieldKey === "string") {
    const normalizedKey = fieldKey.toLowerCase();
    keyMatches =
      normalizedKey.includes("license") &&
      (normalizedKey.includes("key") || normalizedKey.includes("keys"));
  }

  if (keyMatches) {
    return true;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return false;
    }

    if (/serp[-\s_]/i.test(trimmed) || /^key[-_]/i.test(trimmed)) {
      return true;
    }

    if (/\"license\"/i.test(trimmed) || /\"licenseKey\"/i.test(trimmed)) {
      return true;
    }
  }

  if (value && typeof value === "object") {
    if (
      "licenseKey" in (value as Record<string, unknown>) ||
      "key" in (value as Record<string, unknown>)
    ) {
      return true;
    }
  }

  return false;
}

type LicenseRecordInput = {
  key: string;
  fieldKey: string;
  id?: string | null;
  action?: string | null;
  entitlements?: string[];
  tier?: string | null;
  offerIdHint?: string | null;
  url?: string | null;
  issuedAt?: string | null;
  raw: unknown;
};

function buildLicenseRecord(input: LicenseRecordInput): GhlLicenseRecord | null {
  const key = input.key.trim();

  if (!key) {
    return null;
  }

  const entitlementsArray = Array.isArray(input.entitlements)
    ? input.entitlements
    : [];

  const entitlements = entitlementsArray
    .map((item) => sanitizeOfferIdCandidate(item) ?? item.toLowerCase())
    .filter((item, index, array) => array.indexOf(item) === index && item.length > 0);

  const offerId =
    sanitizeOfferIdCandidate(input.offerIdHint) ??
    entitlements[0] ??
    inferOfferIdFromFieldKey(input.fieldKey);

  const url = input.url ? input.url.trim() : null;

  return {
    key,
    id: input.id ? input.id.trim() : null,
    action: input.action ? input.action.trim() : null,
    entitlements,
    tier: input.tier ? input.tier.trim() : null,
    url: url && url.length > 0 ? url : null,
    offerId,
    sourceField: input.fieldKey,
    issuedAt: input.issuedAt ?? null,
    raw: input.raw,
  };
}

export function parseLicenseField(fieldKey: string, value: unknown): GhlLicenseRecord[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => parseLicenseField(fieldKey, entry));
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return parseLicenseField(fieldKey, String(value));
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseLicenseField(fieldKey, parsed);
      } catch {
        // treat as plain string below
      }
    }

    if (trimmed.includes("\n")) {
      return trimmed
        .split(/\r?\n/)
        .flatMap((line) => parseLicenseField(fieldKey, line));
    }

    const record = buildLicenseRecord({
      key: trimmed,
      fieldKey,
      raw: value,
    });

    return record ? [record] : [];
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    if (obj && Object.keys(obj).length === 1 && "value" in obj) {
      return parseLicenseField(fieldKey, obj.value);
    }

    const potentialKey = firstString(
      obj.key,
      obj.licenseKey,
      obj.license_key,
      obj.code,
      obj.value,
      obj.token,
    );

    if (potentialKey) {
      const record = buildLicenseRecord({
        key: potentialKey,
        fieldKey,
        id: firstString(obj.id, obj.licenseId, obj.license_id),
        action: firstString(obj.action, obj.status, obj.state),
        entitlements: toStringArray(obj.entitlements ?? obj.products ?? obj.offers),
        tier: firstString(obj.tier, obj.plan, obj.level, obj.product, obj.offerTier),
        offerIdHint: firstString(obj.offerId, obj.offer_id, obj.slug, obj.productId),
        url: firstString(obj.url, obj.licenseUrl, obj.downloadUrl),
        issuedAt: extractTemporalValue(
          obj.issuedAt,
          obj.createdAt,
          obj.updatedAt,
          obj.timestamp,
        ),
        raw: value,
      });

      return record ? [record] : [];
    }

    const nested: GhlLicenseRecord[] = [];
    for (const nestedValue of Object.values(obj)) {
      nested.push(...parseLicenseField(fieldKey, nestedValue));
    }
    return nested;
  }

  return [];
}

export function extractLicensesFromCustomFields(customFields: Record<string, unknown>): GhlLicenseRecord[] {
  const licenses: GhlLicenseRecord[] = [];

  for (const [fieldKey, value] of Object.entries(customFields)) {
    if (!isPotentialLicenseField(fieldKey, value)) {
      continue;
    }

    licenses.push(...parseLicenseField(fieldKey, value));
  }

  return licenses;
}

export function collectLicensesFromCustomFieldEntries(
  entries: Array<Record<string, unknown>>,
  idLookup?: Map<string, string> | null,
): GhlLicenseRecord[] {
  const licenses: GhlLicenseRecord[] = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    let entryKey = typeof entry.fieldKey === "string" ? entry.fieldKey : undefined;
    const entryId =
      typeof entry.customFieldId === "string"
        ? entry.customFieldId
        : typeof entry.id === "string"
          ? entry.id
          : undefined;

    if (!entryKey && entryId) {
      entryKey = idLookup?.get(entryId) ?? entryId;
    }

    if (!entryKey) {
      continue;
    }

    const entryValue =
      entry.value ??
      entry.fieldValue ??
      entry.field_value ??
      entry.response ??
      null;

    licenses.push(...parseLicenseField(entryKey, entryValue));
  }

  return licenses;
}

