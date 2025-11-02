import logger from "@/lib/logger";
import { GHLSearchResponseContract } from "@/lib/contracts/ghl.contract";

import {
  GHL_API_VERSION,
  GHL_AUTH_TOKEN,
  GHL_BASE_URL,
  GHL_CONTACT_API_ROOT,
  GHL_LOCATION_ID,
  isLeadConnectorHost,
} from "./config";

export type ContactCandidate = {
  id?: string | null;
  email?: string | null;
  tags?: string[] | null;
  customFields?: unknown;
  custom_fields?: unknown;
  fields?: unknown;
  dateUpdated?: string | null;
  updatedAt?: string | null;
  dateAdded?: string | null;
  createdAt?: string | null;
};

export function normalizeContactList(payload: unknown): ContactCandidate[] {
  const parsed = GHLSearchResponseContract.safeParse(payload);
  if (parsed.success) {
    return parsed.data.contacts ?? [];
  }

  if (Array.isArray(payload)) {
    return payload as ContactCandidate[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const candidateObject = payload as Record<string, unknown>;

  if (Array.isArray(candidateObject.contacts)) {
    return candidateObject.contacts as ContactCandidate[];
  }

  if (candidateObject.contact && typeof candidateObject.contact === "object") {
    return [candidateObject.contact as ContactCandidate];
  }

  const data = candidateObject.data;
  if (data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).contacts)) {
    return (data as { contacts: ContactCandidate[] }).contacts;
  }

  return [];
}

export function normalizeCustomFields(
  input: unknown,
  idLookup?: Map<string, string> | null,
): Record<string, unknown> | null {
  if (!input) {
    return null;
  }

  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input) as unknown;
      return normalizeCustomFields(parsed, idLookup);
    } catch {
      return null;
    }
  }

  if (Array.isArray(input)) {
    const result: Record<string, unknown> = {};
    for (const entry of input) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const record = entry as Record<string, unknown>;
      let keyCandidate: string | null = null;
      if (typeof record.fieldKey === "string") {
        keyCandidate = record.fieldKey;
      } else if (typeof record.customFieldId === "string") {
        keyCandidate = record.customFieldId;
      } else if (typeof record.custom_field === "string") {
        keyCandidate = record.custom_field;
      } else if (typeof record.customField === "string") {
        keyCandidate = record.customField;
      } else if (typeof record.id === "string") {
        keyCandidate = idLookup?.get(record.id) ?? record.id;
      }
      if (!keyCandidate) {
        continue;
      }
      const value =
        record.value ??
        record.fieldValue ??
        record.field_value ??
        record.response ??
        null;
      result[keyCandidate] = value;
    }
    return Object.keys(result).length > 0 ? result : null;
  }

  if (typeof input === "object") {
    return input as Record<string, unknown>;
  }

  return null;
}

export async function fetchContactsForEmail(normalisedEmail: string): Promise<ContactCandidate[]> {
  if (!GHL_AUTH_TOKEN || !GHL_LOCATION_ID) {
    return [];
  }

  const payload: Record<string, unknown> = {
    locationId: GHL_LOCATION_ID,
    query: normalisedEmail,
    pageLimit: 50,
  };

  const headers = new Headers({
    Authorization: `Bearer ${GHL_AUTH_TOKEN ?? ""}`,
    Version: GHL_API_VERSION,
    "Content-Type": "application/json",
    Accept: "application/json",
  });

  try {
    const response = await fetch(`${GHL_CONTACT_API_ROOT}/contacts/search`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      return normalizeContactList(data);
    }

    logger.debug("ghl.license_lookup_post_failed", {
      email: normalisedEmail,
      status: response.status,
    });

    const fallbackBase = isLeadConnectorHost ? GHL_BASE_URL : `${GHL_BASE_URL}/v1`;
    const fallbackUrl =
      `${fallbackBase}/contacts/?` +
      new URLSearchParams({
        locationId: GHL_LOCATION_ID ?? "",
        query: normalisedEmail,
        limit: "10",
      }).toString();

    const fallbackResponse = await fetch(fallbackUrl, {
      method: "GET",
      headers,
    });

    if (!fallbackResponse.ok) {
      const text = await fallbackResponse.text();
      logger.debug("ghl.license_lookup_get_failed", {
        email: normalisedEmail,
        status: fallbackResponse.status,
        body: text.slice(0, 200),
      });
      return [];
    }

    const fallbackData = await fallbackResponse.json();
    return normalizeContactList(fallbackData);
  } catch (error) {
    logger.warn("ghl.license_lookup_failed", {
      email: normalisedEmail,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
