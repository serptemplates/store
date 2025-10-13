import logger from "@/lib/logger";

import { GHL_AUTH_TOKEN, GHL_LOCATION_ID } from "./config";
import {
  ensureContactCustomFieldCacheLoaded,
  getCachedContactCustomFieldIdMap,
} from "./custom-fields";
import {
  fetchContactsForEmail,
  normalizeCustomFields,
} from "./contact-search";
import {
  collectLicensesFromCustomFieldEntries,
  extractLicensesFromCustomFields,
} from "./license-utils";
import type { GhlLicenseRecord } from "./types";

export async function fetchContactLicensesByEmail(email: string): Promise<GhlLicenseRecord[]> {
  if (!email) {
    return [];
  }

  if (!GHL_AUTH_TOKEN || !GHL_LOCATION_ID) {
    return [];
  }

  const normalisedEmail = email.trim().toLowerCase();

  if (!normalisedEmail) {
    return [];
  }

  try {
    const contacts = await fetchContactsForEmail(normalisedEmail);

    if (contacts.length === 0) {
      logger.debug("ghl.license_lookup_no_contacts", { email: normalisedEmail });
      return [];
    }

    const scoredContacts = contacts
      .map((contact) => {
        const emailValue =
          typeof contact.email === "string" && contact.email.length > 0
            ? contact.email.toLowerCase()
            : null;

        const updatedAt =
          contact.dateUpdated ??
          contact.updatedAt ??
          contact.dateAdded ??
          contact.createdAt ??
          null;

        return {
          raw: contact,
          email: emailValue,
          updatedAtValue: updatedAt ? new Date(updatedAt).getTime() : 0,
        };
      })
      .sort((a, b) => b.updatedAtValue - a.updatedAtValue);

    const matchingContact =
      scoredContacts.find((entry) => entry.email === normalisedEmail) ??
      scoredContacts.find((entry) => entry.email) ??
      scoredContacts[0];

    if (!matchingContact) {
      return [];
    }

    const rawRecord = matchingContact.raw as Record<string, unknown>;

    const customFieldsRaw =
      rawRecord.customFields ??
      rawRecord.custom_fields ??
      rawRecord.fields ??
      rawRecord["customField"] ??
      rawRecord["custom_field"] ??
      null;

    await ensureContactCustomFieldCacheLoaded();
    const idLookup = getCachedContactCustomFieldIdMap();

    const aggregatedLicenses: GhlLicenseRecord[] = [];

    if (Array.isArray(rawRecord.customFields)) {
      aggregatedLicenses.push(
        ...collectLicensesFromCustomFieldEntries(
          rawRecord.customFields as Array<Record<string, unknown>>,
          idLookup,
        ),
      );
    }

    if (Array.isArray(rawRecord.custom_fields)) {
      aggregatedLicenses.push(
        ...collectLicensesFromCustomFieldEntries(
          rawRecord.custom_fields as Array<Record<string, unknown>>,
          idLookup,
        ),
      );
    }

    if (Array.isArray(rawRecord.fields)) {
      aggregatedLicenses.push(
        ...collectLicensesFromCustomFieldEntries(
          rawRecord.fields as Array<Record<string, unknown>>,
          idLookup,
        ),
      );
    }

    const normalizedFields = normalizeCustomFields(customFieldsRaw, idLookup);
    if (normalizedFields) {
      aggregatedLicenses.push(...extractLicensesFromCustomFields(normalizedFields));
    }

    const meaningfulLicenses = aggregatedLicenses.filter((license) => {
      if (!license.key) {
        return false;
      }

      const hasMetadata = Boolean(
        license.id ||
        license.action ||
        license.url ||
        license.offerId ||
        (license.entitlements && license.entitlements.length > 0) ||
        license.tier,
      );

      const normalizedKey = license.key.trim();

      if (hasMetadata) {
        return true;
      }

      if (license.sourceField.includes("license_keys") || license.sourceField.includes("license_key")) {
        return /^[A-Z0-9-]{8,}$/.test(normalizedKey);
      }

      return /^[A-Z0-9-]{8,}$/.test(normalizedKey);
    });

    if (meaningfulLicenses.length === 0) {
      logger.debug("ghl.license_lookup_no_custom_fields", {
        email: normalisedEmail,
      });
      return [];
    }

    const deduped = new Map<string, GhlLicenseRecord>();
    for (const license of meaningfulLicenses) {
      const key = license.key.toLowerCase();
      if (!deduped.has(key)) {
        deduped.set(key, license);
      }
    }

    return Array.from(deduped.values());
  } catch (error) {
    logger.warn("ghl.license_lookup_failed", {
      email: normalisedEmail,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

