import { setTimeout as sleep } from "node:timers/promises";

import logger from "@/lib/logger";

const GHL_BASE_URL = (process.env.GHL_API_BASE_URL ?? "https://services.leadconnectorhq.com").replace(/\/$/, "");
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_AUTH_TOKEN = process.env.GHL_PAT_LOCATION ?? process.env.GHL_API_TOKEN;
const GHL_API_VERSION = process.env.GHL_API_VERSION ?? "2021-07-28";
const GHL_CUSTOM_FIELD_PURCHASE_METADATA = process.env.GHL_CUSTOM_FIELD_PURCHASE_METADATA;
const GHL_CUSTOM_FIELD_LICENSE_KEYS_V2 = process.env.GHL_CUSTOM_FIELD_LICENSE_KEYS_V2;
const DEFAULT_PURCHASE_METADATA_FIELD_KEY = "contact.purchase_metadata";
const DEFAULT_LICENSE_KEYS_FIELD_KEY = "contact.license_keys_v2";

export const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 250;

export class GhlConfigurationError extends Error {}
export class GhlRequestError extends Error {
  constructor(message: string, public status: number, public body: string) {
    super(message);
    this.name = "GhlRequestError";
  }
}

function ensureConfigured() {
  if (!GHL_AUTH_TOKEN || !GHL_LOCATION_ID) {
    throw new GhlConfigurationError(
      "GHL credentials are not fully configured. Set GHL_PAT_LOCATION (or GHL_API_TOKEN) and GHL_LOCATION_ID.",
    );
  }
}

async function ghlRequest<T>(path: string, init: RequestInit & { retryDescription?: string } = {}, attempt = 1): Promise<T> {
  ensureConfigured();

  const url = `${GHL_BASE_URL}${path}`;
  const headers = new Headers(init.headers ?? {});
  headers.set("Authorization", `Bearer ${GHL_AUTH_TOKEN!}`);
  headers.set("Version", GHL_API_VERSION);
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (response.ok) {
    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }

  if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < MAX_ATTEMPTS) {
    const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
    logger.warn("ghl.request_retry", {
      attempt,
      status: response.status,
      path,
      delayMs: delay,
    });
    await sleep(delay);
    return ghlRequest(path, init, attempt + 1);
  }

  const body = await response.text();
  logger.error("ghl.request_failed", {
    status: response.status,
    path,
    responseBody: body,
    request: init.body
  });
  throw new GhlRequestError(`GHL request failed with status ${response.status}: ${body}`, response.status, body);
}

type CustomFieldInput = { id: string; value: string | number | boolean };

export type UpsertContactParams = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  source?: string;
  tags?: string[];
  customFields?: CustomFieldInput[];
};

export type UpsertContactResponse = {
  contactId: string;
};

export async function upsertContact(params: UpsertContactParams): Promise<UpsertContactResponse | null> {
  ensureConfigured();

  const body: Record<string, unknown> = {
    locationId: GHL_LOCATION_ID,
    email: params.email,
  };

  if (params.firstName) body.firstName = params.firstName;
  if (params.lastName) body.lastName = params.lastName;
  if (params.phone) body.phone = params.phone;
  if (params.source) body.source = params.source;
  if (params.tags && params.tags.length > 0) body.tags = params.tags;
  if (params.customFields && params.customFields.length > 0) {
    body.customFields = params.customFields.map((field) => ({ id: field.id, value: field.value }));
  }

  // Log the full request body for debugging
  const requestBody = JSON.stringify(body);
  logger.info("ghl.upsert_contact_request", {
    email: params.email,
    bodyKeys: Object.keys(body),
    customFieldsCount: params.customFields?.length ?? 0,
    fullBody: requestBody,
  });

  try {
    const result = await ghlRequest<{ contact?: { id?: string } }>("/contacts/upsert", {
      method: "POST",
      body: requestBody,
    });

    const contactId = result?.contact?.id;
    if (!contactId) {
      return null;
    }
    return { contactId };
  } catch (error) {
    logger.error("ghl.upsert_contact_failed", {
      email: params.email,
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
    throw error;
  }
}

export type OpportunityParams = {
  contactId: string;
  pipelineId: string;
  stageId: string;
  name: string;
  monetaryValue?: number | null;
  currency?: string | null;
  status?: string;
  source?: string;
  tags?: string[];
  customFields?: CustomFieldInput[];
};

export async function createOpportunity(params: OpportunityParams): Promise<void> {
  ensureConfigured();

  const payload: Record<string, unknown> = {
    locationId: GHL_LOCATION_ID,
    contactId: params.contactId,
    pipelineId: params.pipelineId,
    pipelineStageId: params.stageId,  // Changed from stageId to pipelineStageId
    name: params.name,
  };

  if (typeof params.monetaryValue === "number") {
    payload.monetaryValue = params.monetaryValue;
  }
  // Removed currency field - seems GHL doesn't accept it
  if (params.status) payload.status = params.status;
  if (params.source) payload.source = params.source;
  if (params.tags && params.tags.length > 0) payload.tags = params.tags;
  if (params.customFields && params.customFields.length > 0) {
    payload.customFields = params.customFields.map((field) => ({ id: field.id, value: field.value }));
  }

  try {
    await ghlRequest("/opportunities/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    logger.error("ghl.create_opportunity_failed", {
      contactId: params.contactId,
      pipelineId: params.pipelineId,
      stageId: params.stageId,
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
    throw error;
  }
}

export async function triggerWorkflow(workflowId: string, contactId: string): Promise<void> {
  ensureConfigured();
  try {
    await ghlRequest(`/workflows/${workflowId}/execute`, {
      method: "POST",
      body: JSON.stringify({
        locationId: GHL_LOCATION_ID,
        contactId,
      }),
    });
  } catch (error) {
    logger.error("ghl.trigger_workflow_failed", {
      workflowId,
      contactId,
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
    throw error;
  }
}

export type GhlSyncConfig = {
  tagIds?: string[];
  workflowIds?: string[];
  opportunityNameTemplate?: string;
  status?: string;
  source?: string;
  contactCustomFieldIds?: Record<string, string>;
  opportunityCustomFieldIds?: Record<string, string>;
  pipelineId?: string;
  stageId?: string;
};

export type GhlSyncContext = {
  offerId: string;
  offerName: string;
  customerEmail: string;
  customerName?: string | null;
  customerPhone?: string | null;
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  amountTotal?: number | null;
  amountFormatted?: string | null;
  currency?: string | null;
  landerId?: string | null;
  metadata?: Record<string, string>;
  productPageUrl?: string | null;
  purchaseUrl?: string | null;
  provider?: string | null;
  licenseKey?: string | null | undefined;
  licenseId?: string | null | undefined;
  licenseAction?: string | null | undefined;
  licenseEntitlements?: string[] | null | undefined;
  licenseTier?: string | null | undefined;
  licenseFeatures?: Record<string, unknown> | null | undefined;
};

type ContactCustomFieldDescriptor = {
  id: string;
  fieldKey?: string | null;
};

let contactCustomFieldCache: Map<string, string> | null = null;
let contactCustomFieldFetchPromise: Promise<Map<string, string>> | null = null;

async function fetchContactCustomFieldCache(): Promise<Map<string, string>> {
  if (!GHL_AUTH_TOKEN || !GHL_LOCATION_ID) {
    return new Map();
  }

  try {
    const response = await ghlRequest<{ customFields?: ContactCustomFieldDescriptor[] }>(
      `/locations/${GHL_LOCATION_ID}/customFields?model=contact`
    );

    const map = new Map<string, string>();
    for (const field of response.customFields ?? []) {
      const fieldKey = field.fieldKey ?? null;
      if (typeof fieldKey === "string" && fieldKey.length > 0 && field.id) {
        map.set(fieldKey, field.id);
      }
    }
    return map;
  } catch (error) {
    logger.warn("ghl.custom_field_fetch_failed", {
      fieldType: "contact",
      locationId: GHL_LOCATION_ID,
      error: error instanceof Error ? error.message : String(error),
    });
    return new Map();
  }
}

async function getContactCustomFieldIdByKey(fieldKey: string): Promise<string | undefined> {
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

async function resolveFieldSpecifier(specifier: string | undefined, fallbackFieldKey?: string): Promise<string | undefined> {
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

async function resolveContactCustomFieldIds(
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

export type SyncOutcome = {
  contactId?: string;
  opportunityCreated?: boolean;
};

function splitName(name: string | null | undefined) {
  if (!name) return { firstName: undefined, lastName: undefined };
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: undefined };
  }
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1) };
}

function buildCustomFieldPayload(map: Record<string, string> | undefined, context: Record<string, unknown>): CustomFieldInput[] {
  if (!map) return [];
  const entries: CustomFieldInput[] = [];
  for (const [contextKey, fieldId] of Object.entries(map)) {
    const value = context[contextKey];
    if (value === undefined || value === null || fieldId === "") {
      continue;
    }
    entries.push({ id: fieldId, value: value as string | number | boolean });
  }
  return entries;
}

function renderTemplate(template: string | undefined, context: Record<string, unknown>, fallback: string): string {
  if (!template) return fallback;
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key) => {
    const value = context[key as keyof typeof context];
    return value === undefined || value === null ? "" : String(value);
  }) || fallback;
}

function compactObject(input: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        continue;
      }
      result[key] = value;
      continue;
    }

    if (typeof value === "object") {
      const nested = compactObject(value as Record<string, unknown>);
      if (Object.keys(nested).length === 0) {
        continue;
      }
      result[key] = nested;
      continue;
    }

    if (typeof value === "string" && value.trim().length === 0) {
      continue;
    }

    result[key] = value;
  }

  return result;
}

function buildPurchaseMetadata(context: GhlSyncContext): string | undefined {
  const amountDecimal = typeof context.amountTotal === "number"
    ? Number((context.amountTotal / 100).toFixed(2))
    : undefined;

  const productPageUrl = context.productPageUrl
    ?? context.metadata?.productPageUrl
    ?? context.metadata?.product_page_url
    ?? context.metadata?.productPageURL;

  const checkoutUrl = context.purchaseUrl
    ?? context.metadata?.purchaseUrl
    ?? context.metadata?.purchase_url
    ?? context.metadata?.checkoutUrl
    ?? context.metadata?.checkout_url;

  const metadataPayload = context.metadata && Object.keys(context.metadata).length > 0
    ? context.metadata
    : undefined;

  const licenseDetails = context.licenseKey
    || (context.licenseEntitlements && context.licenseEntitlements.length > 0)
    || context.licenseId
    || context.licenseAction
    ? compactObject({
        key: context.licenseKey ?? undefined,
        id: context.licenseId ?? undefined,
        action: context.licenseAction ?? undefined,
        entitlements: context.licenseEntitlements ?? undefined,
        tier: context.licenseTier ?? undefined,
        features: context.licenseFeatures && Object.keys(context.licenseFeatures).length > 0
          ? context.licenseFeatures
          : undefined,
      })
    : undefined;

  const payload = compactObject({
    provider: context.provider ?? undefined,
    product: compactObject({
      id: context.offerId,
      name: context.offerName,
      pageUrl: productPageUrl ?? undefined,
      purchaseUrl: checkoutUrl ?? undefined,
      landerId: context.landerId ?? undefined,
    }),
    customer: compactObject({
      email: context.customerEmail,
      name: context.customerName ?? undefined,
      phone: context.customerPhone ?? undefined,
    }),
    payment: compactObject({
      amountCents: typeof context.amountTotal === "number" ? context.amountTotal : undefined,
      amount: amountDecimal,
      amountFormatted: context.amountFormatted ?? undefined,
      currency: context.currency ?? undefined,
      stripeSessionId: context.stripeSessionId ?? undefined,
      stripePaymentIntentId: context.stripePaymentIntentId ?? undefined,
    }),
    metadata: metadataPayload,
    license: licenseDetails,
  });

  if (Object.keys(payload).length === 0) {
    return undefined;
  }

  try {
    return JSON.stringify(payload, null, 2);
  } catch (error) {
    logger.error("ghl.purchase_metadata_stringify_failed", {
      offerId: context.offerId,
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

function buildLicenseKeysPayload(context: GhlSyncContext): string | undefined {
  const hasLicenseData = Boolean(
    context.licenseKey
      || context.licenseId
      || context.licenseAction
      || (context.licenseEntitlements && context.licenseEntitlements.length > 0)
  );

  if (!hasLicenseData) {
    return undefined;
  }

  const payload = compactObject({
    key: context.licenseKey ?? undefined,
    id: context.licenseId ?? undefined,
    action: context.licenseAction ?? undefined,
    entitlements: context.licenseEntitlements ?? undefined,
    tier: context.licenseTier ?? undefined,
  });

  try {
    return JSON.stringify(payload, null, 2);
  } catch (error) {
    logger.error("ghl.license_keys_payload_stringify_failed", {
      offerId: context.offerId,
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

  const contactFieldContext: Record<string, unknown> = {
    ...baseContext,
    purchaseMetadataJson,
    licenseKeysJson,
  };

  const resolvedContactCustomFieldIds = await resolveContactCustomFieldIds(config.contactCustomFieldIds);

  const contactCustomFields = buildCustomFieldPayload(resolvedContactCustomFieldIds, contactFieldContext);

  const affiliateFieldId = process.env.GHL_AFFILIATE_FIELD_ID;
  if (affiliateFieldId && affiliateIdValue) {
    contactCustomFields.push({ id: affiliateFieldId, value: affiliateIdValue });
  }

  const contactSource = config.source ?? (context.provider === "paypal" ? "PayPal Checkout" : "Stripe Checkout");

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
      `${context.offerName} Purchase`
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
