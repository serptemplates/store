import logger from "@/lib/logger";

import {
  DEFAULT_LICENSE_KEYS_FIELD_KEY,
  DEFAULT_PURCHASE_METADATA_FIELD_KEY,
  GHL_CUSTOM_FIELD_LICENSE_KEYS_V2,
  GHL_CUSTOM_FIELD_PURCHASE_METADATA,
  GHL_LOCATION_ID,
  ensureConfigured,
} from "./config";
import { ghlRequest } from "./http";

type ContactCustomFieldDescriptor = {
  id: string;
  fieldKey?: string | null;
};

let contactCustomFieldCache: Map<string, string> | null = null;
let contactCustomFieldFetchPromise: Promise<Map<string, string>> | null = null;
let contactCustomFieldIdMap: Map<string, string> | null = null;

async function fetchContactCustomFieldCache(): Promise<Map<string, string>> {
  if (!GHL_LOCATION_ID) {
    contactCustomFieldIdMap = new Map();
    return new Map();
  }

  try {
    ensureConfigured();
    const response = await ghlRequest<{ customFields?: ContactCustomFieldDescriptor[] }>(
      `/locations/${GHL_LOCATION_ID}/customFields?model=contact`,
    );

    const map = new Map<string, string>();
    const idMap = new Map<string, string>();
    for (const field of response.customFields ?? []) {
      const fieldKey = field.fieldKey ?? null;
      if (typeof fieldKey === "string" && fieldKey.length > 0 && field.id) {
        map.set(fieldKey, field.id);
        idMap.set(field.id, fieldKey);
      }
    }
    contactCustomFieldIdMap = idMap;
    return map;
  } catch (error) {
    logger.warn("ghl.custom_field_fetch_failed", {
      fieldType: "contact",
      locationId: GHL_LOCATION_ID,
      error: error instanceof Error ? error.message : String(error),
    });
    contactCustomFieldIdMap = new Map();
    return new Map();
  }
}

export async function getContactCustomFieldIdByKey(fieldKey: string): Promise<string | undefined> {
  if (!fieldKey || typeof fieldKey !== "string") {
    return undefined;
  }

  if (contactCustomFieldCache?.has(fieldKey)) {
    return contactCustomFieldCache.get(fieldKey);
  }

  if (!contactCustomFieldFetchPromise) {
    contactCustomFieldFetchPromise = fetchContactCustomFieldCache().finally(() => {
      contactCustomFieldFetchPromise = null;
    });
  }

  const cache = await contactCustomFieldFetchPromise;
  contactCustomFieldCache = cache;
  return cache.get(fieldKey);
}

export async function ensureContactCustomFieldCacheLoaded(): Promise<void> {
  if (contactCustomFieldCache) {
    return;
  }
  if (!contactCustomFieldFetchPromise) {
    contactCustomFieldFetchPromise = fetchContactCustomFieldCache().finally(() => {
      contactCustomFieldFetchPromise = null;
    });
  }
  const cache = await contactCustomFieldFetchPromise;
  contactCustomFieldCache = cache;
}

export async function getContactCustomFieldKeyById(fieldId: string): Promise<string | undefined> {
  if (!fieldId) {
    return undefined;
  }

  if (contactCustomFieldIdMap?.has(fieldId)) {
    return contactCustomFieldIdMap.get(fieldId);
  }

  await ensureContactCustomFieldCacheLoaded();
  return contactCustomFieldIdMap?.get(fieldId);
}

export async function resolveFieldSpecifier(specifier: string | undefined, fallbackFieldKey?: string): Promise<string | undefined> {
  if (specifier && specifier.length > 0) {
    if (specifier.startsWith("contact.")) {
      const resolved = await getContactCustomFieldIdByKey(specifier);
      if (resolved) {
        return resolved;
      }
      logger.warn("ghl.custom_field_lookup_unresolved", {
        fieldKey: specifier,
        locationId: GHL_LOCATION_ID,
      });
      return undefined;
    }
    return specifier;
  }

  if (fallbackFieldKey) {
    return getContactCustomFieldIdByKey(fallbackFieldKey);
  }

  return undefined;
}

export async function resolveContactCustomFieldIds(
  initial?: Record<string, string>,
): Promise<Record<string, string>> {
  const resolved: Record<string, string> = {};

  if (initial) {
    for (const [contextKey, specifier] of Object.entries(initial)) {
      const fieldId = await resolveFieldSpecifier(specifier);
      if (fieldId) {
        resolved[contextKey] = fieldId;
      }
    }
  }

  if (!resolved.purchaseMetadataJson) {
    const fieldId = await resolveFieldSpecifier(
      GHL_CUSTOM_FIELD_PURCHASE_METADATA,
      DEFAULT_PURCHASE_METADATA_FIELD_KEY,
    );
    if (fieldId) {
      resolved.purchaseMetadataJson = fieldId;
    }
  }

  if (!resolved.licenseKeysJson) {
    const fieldId = await resolveFieldSpecifier(
      GHL_CUSTOM_FIELD_LICENSE_KEYS_V2,
      DEFAULT_LICENSE_KEYS_FIELD_KEY,
    );
    if (fieldId) {
      resolved.licenseKeysJson = fieldId;
    }
  }

  return resolved;
}

export function getCachedContactCustomFieldIdMap(): Map<string, string> | null {
  return contactCustomFieldIdMap;
}
