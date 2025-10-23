import logger from "@/lib/logger";

import {
  DEFAULT_PURCHASE_METADATA_FIELD_KEY,
  GHL_AUTH_TOKEN,
  GHL_LOCATION_ID,
} from "./config";
import {
  buildLicenseKeysPayload,
  buildPurchaseMetadata,
  renderTemplate,
  splitName,
} from "./context";
import type { ContactCandidate } from "./contact-search";
import { fetchContactsForEmail } from "./contact-search";
import {
  resolveContactCustomFieldIds,
} from "./custom-fields";
import {
  buildCustomFieldPayload,
  createOpportunity,
  triggerWorkflow,
  upsertContact,
} from "./contacts";
import type { GhlSyncConfig, GhlSyncContext, SyncOutcome } from "./types";

const MAX_PURCHASE_HISTORY_ENTRIES = 25;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeParseJsonString(value: unknown): unknown | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function cloneJson(value: Record<string, unknown>): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    return { ...value };
  }
}

function collectPurchaseMetadataEntries(value: unknown): Record<string, unknown>[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (typeof value === "string") {
    const parsed = safeParseJsonString(value);
    return parsed === undefined ? [] : collectPurchaseMetadataEntries(parsed);
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectPurchaseMetadataEntries(entry));
  }

  if (isRecord(value)) {
    const clone = cloneJson(value);

    const nestedSources: unknown[] = [];
    if (Array.isArray(clone.previousPurchases)) {
      nestedSources.push(...clone.previousPurchases);
      delete clone.previousPurchases;
    }
    if (Array.isArray(clone.history)) {
      nestedSources.push(...clone.history);
      delete clone.history;
    }

    return [
      clone,
      ...nestedSources.flatMap((entry) => collectPurchaseMetadataEntries(entry)),
    ];
  }

  return [];
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function computeFallbackKey(entry: Record<string, unknown>): string {
  try {
    return `hash:${JSON.stringify(entry)}`;
  } catch {
    return `hash:${Math.random().toString(36).slice(2)}`;
  }
}

function getPurchaseEntryKey(entry: Record<string, unknown>): string | null {
  const payment = isRecord(entry.payment) ? (entry.payment as Record<string, unknown>) : null;
  if (payment) {
    const intent = normalizeString(
      payment.stripePaymentIntentId ?? payment.paymentIntentId ?? payment.intentId,
    );
    if (intent) {
      return `intent:${intent.toLowerCase()}`;
    }

    const session = normalizeString(
      payment.stripeSessionId ?? payment.sessionId ?? payment.checkoutSessionId,
    );
    if (session) {
      return `session:${session.toLowerCase()}`;
    }

    const invoice = normalizeString(payment.invoiceId ?? payment.invoice_id);
    if (invoice) {
      return `invoice:${invoice.toLowerCase()}`;
    }
  }

  const metadata = isRecord(entry.metadata) ? (entry.metadata as Record<string, unknown>) : null;
  if (metadata) {
    const orderId = normalizeString(metadata.orderId ?? metadata.order_id);
    if (orderId) {
      return `metadata-order:${orderId.toLowerCase()}`;
    }
  }

  const product = isRecord(entry.product) ? (entry.product as Record<string, unknown>) : null;
  if (product) {
    const id = normalizeString(product.id ?? product.offerId ?? product.offer_id);
    if (id) {
      return `product:${id.toLowerCase()}`;
    }
  }

  return null;
}

function mergePurchaseMetadataHistory(existing: unknown, newJson: string): string | undefined {
  if (!newJson) {
    return undefined;
  }

  let latestEntry: Record<string, unknown>;
  try {
    const parsed = JSON.parse(newJson) as unknown;
    if (!isRecord(parsed)) {
      return newJson;
    }
    latestEntry = parsed as Record<string, unknown>;
  } catch {
    return newJson;
  }

  const historyEntries = collectPurchaseMetadataEntries(existing);

  const newEntryKey = getPurchaseEntryKey(latestEntry);
  const newEntryFallbackKey = newEntryKey ?? computeFallbackKey(latestEntry);

  const seenKeys = new Set<string>([newEntryFallbackKey]);
  if (newEntryKey) {
    seenKeys.add(newEntryKey);
  }

  const dedupedHistory: Record<string, unknown>[] = [];
  for (const entry of historyEntries) {
    const key = getPurchaseEntryKey(entry);
    const primaryKey = key ?? computeFallbackKey(entry);
    if (seenKeys.has(primaryKey)) {
      continue;
    }
    seenKeys.add(primaryKey);
    if (key) {
      seenKeys.add(key);
    }
    dedupedHistory.push(entry);
  }

  if (dedupedHistory.length > MAX_PURCHASE_HISTORY_ENTRIES) {
    dedupedHistory.length = MAX_PURCHASE_HISTORY_ENTRIES;
  }

  if (dedupedHistory.length > 0) {
    latestEntry.previousPurchases = dedupedHistory;
  } else {
    delete latestEntry.previousPurchases;
  }

  return JSON.stringify(latestEntry, null, 2);
}

function parseTimestamp(value: unknown): number {
  if (typeof value !== "string") {
    return 0;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function selectPreferredContact(
  contacts: ContactCandidate[],
  normalizedEmail: string,
): ContactCandidate | null {
  if (!contacts.length) {
    return null;
  }

  const scored = contacts
    .map((contact) => {
      const emailValue =
        typeof contact.email === "string" && contact.email.length > 0
          ? contact.email.trim().toLowerCase()
          : null;

      const updatedAtValue = Math.max(
        parseTimestamp(contact.dateUpdated),
        parseTimestamp(contact.updatedAt),
        parseTimestamp(contact.dateAdded),
        parseTimestamp(contact.createdAt),
        0,
      );

      return { contact, emailValue, updatedAtValue };
    })
    .sort((a, b) => b.updatedAtValue - a.updatedAtValue);

  const exactMatch = scored.find((entry) => entry.emailValue === normalizedEmail);
  if (exactMatch) {
    return exactMatch.contact;
  }

  const firstWithEmail = scored.find((entry) => entry.emailValue);
  if (firstWithEmail) {
    return firstWithEmail.contact;
  }

  return scored[0]?.contact ?? null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

function extractFromCollection(collection: unknown, fieldId: string): unknown {
  if (!collection) {
    return undefined;
  }

  if (Array.isArray(collection)) {
    for (const entryRaw of collection) {
      if (!entryRaw || typeof entryRaw !== "object") {
        continue;
      }
      const entry = entryRaw as Record<string, unknown>;

      const candidateIds = [
        entry.id,
        entry.customFieldId,
        entry.custom_field_id,
        entry.customField,
        entry.custom_field,
      ];

      if (
        candidateIds.some(
          (candidate) => typeof candidate === "string" && candidate.trim() === fieldId,
        )
      ) {
        return (
          entry.value ??
          entry.fieldValue ??
          entry.field_value ??
          entry.response ??
          entry.values ??
          null
        );
      }

      const fieldKey = firstString(
        entry.fieldKey,
        entry.field_key,
        entry.key,
        entry.customFieldKey,
      );

      if (fieldKey && fieldKey === DEFAULT_PURCHASE_METADATA_FIELD_KEY) {
        return (
          entry.value ??
          entry.fieldValue ??
          entry.field_value ??
          entry.response ??
          entry.values ??
          null
        );
      }
    }
    return undefined;
  }

  if (typeof collection === "string") {
    const parsed = safeParseJsonString(collection);
    if (parsed === undefined) {
      return undefined;
    }
    return extractFromCollection(parsed, fieldId);
  }

  if (isRecord(collection)) {
    if (fieldId in collection) {
      return collection[fieldId];
    }
    if (DEFAULT_PURCHASE_METADATA_FIELD_KEY in collection) {
      return collection[DEFAULT_PURCHASE_METADATA_FIELD_KEY];
    }
  }

  return undefined;
}

function extractPurchaseMetadataFromContact(
  contact: ContactCandidate,
  fieldId: string,
): unknown {
  const candidateCollections: unknown[] = [];

  const contactAsRecord = contact as Record<string, unknown>;

  if (contactAsRecord.customFields !== undefined) {
    candidateCollections.push(contactAsRecord.customFields);
  }
  if (contactAsRecord.custom_fields !== undefined) {
    candidateCollections.push(contactAsRecord.custom_fields);
  }
  if (contactAsRecord.fields !== undefined) {
    candidateCollections.push(contactAsRecord.fields);
  }

  for (const collection of candidateCollections) {
    const value = extractFromCollection(collection, fieldId);
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

async function fetchExistingPurchaseMetadataValue(
  email: string,
  fieldId: string,
): Promise<unknown> {
  if (!email || !fieldId) {
    return undefined;
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return undefined;
  }

  try {
    const contacts = await fetchContactsForEmail(normalizedEmail);
    if (!contacts.length) {
      return undefined;
    }

    const contact = selectPreferredContact(contacts, normalizedEmail);
    if (!contact) {
      return undefined;
    }

    return extractPurchaseMetadataFromContact(contact, fieldId);
  } catch (error) {
    logger.warn("ghl.purchase_metadata_lookup_failed", {
      email: normalizedEmail,
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

export async function syncOrderWithGhl(config: GhlSyncConfig | undefined, context: GhlSyncContext): Promise<SyncOutcome | null> {
  if (!config) {
    logger.debug("ghl.skip_no_config", { offerId: context.offerId });
    return null;
  }

  if (!GHL_AUTH_TOKEN || !GHL_LOCATION_ID) {
    logger.warn("ghl.skip_missing_credentials", { offerId: context.offerId });
    return null;
  }

  if (!context.customerEmail) {
    logger.warn("ghl.skip_missing_email", { offerId: context.offerId });
    return null;
  }

  const affiliateIdValue = context.metadata?.affiliateId ?? undefined;
  const { firstName, lastName } = splitName(context.customerName);
  const baseContext: Record<string, unknown> = {
    ...context,
    ...(context.metadata ?? {}),
    firstName,
    lastName,
    affiliateId: affiliateIdValue,
    amountDecimal: context.amountTotal != null ? context.amountTotal / 100 : undefined,
  };

  const purchaseMetadataJson = buildPurchaseMetadata(context);
  const licenseKeysJson = buildLicenseKeysPayload(context);

  const resolvedContactCustomFieldIds = await resolveContactCustomFieldIds(config.contactCustomFieldIds);

  let mergedPurchaseMetadataJson = purchaseMetadataJson;
  const purchaseMetadataFieldId = resolvedContactCustomFieldIds.purchaseMetadataJson;

  if (purchaseMetadataJson && purchaseMetadataFieldId) {
    const existingPurchaseMetadata = await fetchExistingPurchaseMetadataValue(
      context.customerEmail,
      purchaseMetadataFieldId,
    );

    const merged = mergePurchaseMetadataHistory(existingPurchaseMetadata, purchaseMetadataJson);
    if (merged && merged !== purchaseMetadataJson) {
      const previousCount = collectPurchaseMetadataEntries(existingPurchaseMetadata).length;
      logger.debug("ghl.purchase_metadata_history_appended", {
        offerId: context.offerId,
        previousCount,
      });
    }

    if (merged) {
      mergedPurchaseMetadataJson = merged;
    }
  }

  const contactFieldContext: Record<string, unknown> = {
    ...baseContext,
    purchaseMetadataJson: mergedPurchaseMetadataJson,
    licenseKeysJson,
  };

  const contactCustomFields = buildCustomFieldPayload(resolvedContactCustomFieldIds, contactFieldContext);

  const affiliateFieldId = process.env.GHL_AFFILIATE_FIELD_ID;
  if (affiliateFieldId && affiliateIdValue) {
    contactCustomFields.push({ id: affiliateFieldId, value: affiliateIdValue });
  }

  const contactSource = config.source ?? "Stripe Checkout";

  const contactResult = await upsertContact({
    email: context.customerEmail,
    firstName,
    lastName,
    phone: context.customerPhone ?? undefined,
    source: contactSource,
    tags: config.tagIds,
    customFields: contactCustomFields,
  });

  const contactId = contactResult?.contactId;
  if (!contactId) {
    logger.warn("ghl.contact_missing_id", {
      offerId: context.offerId,
      email: context.customerEmail,
    });
    return null;
  }

  logger.info("ghl.contact_upserted", {
    offerId: context.offerId,
    stripePaymentIntentId: context.stripePaymentIntentId ?? null,
    email: context.customerEmail,
    contactId,
  });

  const shouldCreateOpportunity = Boolean(config.pipelineId && config.stageId);

  if (shouldCreateOpportunity) {
    const opportunityName = renderTemplate(
      config.opportunityNameTemplate,
      {
        ...baseContext,
        contactFirstName: firstName,
        contactLastName: lastName,
      },
      `${context.offerName} Purchase`,
    );

    const opportunityCustomFields = buildCustomFieldPayload(config.opportunityCustomFieldIds, {
      ...baseContext,
      contactId,
    });

    const monetaryValue = typeof context.amountTotal === "number" ? Math.max(context.amountTotal / 100, 0) : undefined;

    await createOpportunity({
      contactId,
      pipelineId: config.pipelineId!,
      stageId: config.stageId!,
      name: opportunityName,
      monetaryValue,
      currency: context.currency ?? "USD",
      status: config.status ?? "open",
      source: config.source ?? "Stripe Checkout",
      tags: config.tagIds,
      customFields: opportunityCustomFields,
    });

    logger.info("ghl.opportunity_created", {
      offerId: context.offerId,
      contactId,
      pipelineId: config.pipelineId,
      stageId: config.stageId,
    });
  } else {
    logger.debug("ghl.skip_opportunity_creation", {
      offerId: context.offerId,
      reason: "missing_pipeline_or_stage",
    });
  }

  if (config.workflowIds && config.workflowIds.length > 0) {
    for (const workflowId of config.workflowIds) {
      if (!workflowId) continue;
      try {
        await triggerWorkflow(workflowId, contactId);
      } catch (error) {
        logger.error("ghl.trigger_workflow_failed", {
          workflowId,
          contactId,
          error: error instanceof Error ? { message: error.message, name: error.name } : error,
        });
      }
    }
  }

  return { contactId, opportunityCreated: shouldCreateOpportunity };
}
