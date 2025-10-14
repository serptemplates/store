import logger from "@/lib/logger";

import {
  DEFAULT_LICENSE_KEYS_FIELD_KEY,
  GHL_AUTH_TOKEN,
  GHL_LOCATION_ID,
} from "./config";
import { resolveFieldSpecifier } from "./custom-fields";
import { upsertContact } from "./contacts";

export async function clearContactCustomField(
  email: string,
  options?: { fieldSpecifier?: string; value?: string | number | boolean | null },
): Promise<{ success: boolean; contactId: string | null; fieldId: string | null }> {
  const trimmedEmail = email?.trim();

  if (!trimmedEmail) {
    return { success: false, contactId: null, fieldId: null };
  }

  if (!GHL_AUTH_TOKEN || !GHL_LOCATION_ID) {
    logger.warn("ghl.clear_field_missing_credentials", {
      fieldSpecifier: options?.fieldSpecifier,
    });
    return { success: false, contactId: null, fieldId: null };
  }

  const fallbackKey = DEFAULT_LICENSE_KEYS_FIELD_KEY;
  const specifier = options?.fieldSpecifier && options.fieldSpecifier.trim().length > 0
    ? options.fieldSpecifier.trim()
    : fallbackKey;

  const fieldId = await resolveFieldSpecifier(specifier, fallbackKey);

  if (!fieldId) {
    logger.warn("ghl.clear_field_missing_id", {
      fieldSpecifier: specifier,
    });
    return { success: false, contactId: null, fieldId: null };
  }

  const value = options?.value ?? "";

  try {
    const result = await upsertContact({
      email: trimmedEmail,
      customFields: [{ id: fieldId, value }],
    });

    return {
      success: Boolean(result?.contactId),
      contactId: result?.contactId ?? null,
      fieldId,
    };
  } catch (error) {
    logger.error("ghl.clear_field_failed", {
      email: trimmedEmail,
      fieldSpecifier: specifier,
      error: error instanceof Error ? { name: error.name, message: error.message } : error,
    });
    return { success: false, contactId: null, fieldId };
  }
}

