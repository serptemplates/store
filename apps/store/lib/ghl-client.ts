import { setTimeout as sleep } from "node:timers/promises";

import logger from "@/lib/logger";
import { GHLSearchResponseContract } from "@/lib/contracts/ghl.contract";

const RAW_GHL_API_BASE_URL = process.env.GHL_API_BASE_URL ?? "https://services.leadconnectorhq.com";
const GHL_BASE_URL = RAW_GHL_API_BASE_URL.replace(/\/$/, "");
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_AUTH_TOKEN =
  process.env.GHL_PAT_LOCATION ??
  process.env.GHL_API_TOKEN ??
  process.env.GHL_API_KEY;
const GHL_API_VERSION = process.env.GHL_API_VERSION ?? "2021-07-28";
const GHL_CUSTOM_FIELD_PURCHASE_METADATA = process.env.GHL_CUSTOM_FIELD_PURCHASE_METADATA;
const GHL_CUSTOM_FIELD_LICENSE_KEYS_V2 = process.env.GHL_CUSTOM_FIELD_LICENSE_KEYS_V2;
const DEFAULT_PURCHASE_METADATA_FIELD_KEY = "contact.purchase_metadata";
const DEFAULT_LICENSE_KEYS_FIELD_KEY = "contact.license_keys_v2";

const isLeadConnectorHost = GHL_BASE_URL.includes("leadconnectorhq.com");
const inferredV1Base = isLeadConnectorHost ? GHL_BASE_URL : `${GHL_BASE_URL}/v1`;
const GHL_CONTACT_API_ROOT = (process.env.GHL_API_V1_BASE_URL ?? inferredV1Base).replace(/\/$/, "");


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

async function ghlRequest<T>(
  path: string,
  init: (RequestInit & { retryDescription?: string; suppressErrorLogStatuses?: number[] }) = {},
  attempt = 1,
): Promise<T> {
  ensureConfigured();

  const url = `${GHL_BASE_URL}${path}`;
  const { suppressErrorLogStatuses, ...requestInit } = init;
  const headers = new Headers(requestInit.headers ?? {});
  headers.set("Authorization", `Bearer ${GHL_AUTH_TOKEN!}`);
  headers.set("Version", GHL_API_VERSION);
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");

  const response = await fetch(url, {
    ...requestInit,
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
  if (suppressErrorLogStatuses?.includes(response.status)) {
    logger.debug("ghl.request_failed_suppressed", {
      status: response.status,
      path,
      responseBody: body,
      request: requestInit.body,
    });
  } else {
    logger.error("ghl.request_failed", {
      status: response.status,
      path,
      responseBody: body,
      request: requestInit.body,
    });
  }
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
let contactCustomFieldIdMap: Map<string, string> | null = null;

async function fetchContactCustomFieldCache(): Promise<Map<string, string>> {
  if (!GHL_AUTH_TOKEN || !GHL_LOCATION_ID) {
    contactCustomFieldIdMap = new Map();
    return new Map();
  }

  try {
    const response = await ghlRequest<{ customFields?: ContactCustomFieldDescriptor[] }>(
      `/locations/${GHL_LOCATION_ID}/customFields?model=contact`
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

async function ensureContactCustomFieldCacheLoaded(): Promise<void> {
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

async function getContactCustomFieldKeyById(fieldId: string): Promise<string | undefined> {
  if (!fieldId) {
    return undefined;
  }

  if (contactCustomFieldIdMap?.has(fieldId)) {
    return contactCustomFieldIdMap.get(fieldId);
  }

  await ensureContactCustomFieldCacheLoaded();
  return contactCustomFieldIdMap?.get(fieldId);
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

export interface GhlLicenseRecord {
  key: string;
  id: string | null;
  action: string | null;
  entitlements: string[];
  tier: string | null;
  url: string | null;
  offerId: string | null;
  sourceField: string;
  issuedAt: string | null;
  raw: unknown;
}

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

function sanitizeOfferIdCandidate(value: unknown): string | null {
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

function inferOfferIdFromFieldKey(fieldKey: string): string | null {
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

function firstString(...values: unknown[]): string | null {
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

function extractTemporalValue(...values: unknown[]): string | null {
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

function toStringArray(value: unknown): string[] {
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

function isPotentialLicenseField(fieldKey: string, value: unknown): boolean {
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

function parseLicenseField(fieldKey: string, value: unknown): GhlLicenseRecord[] {
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

function extractLicensesFromCustomFields(customFields: Record<string, unknown>): GhlLicenseRecord[] {
  const licenses: GhlLicenseRecord[] = [];

  for (const [fieldKey, value] of Object.entries(customFields)) {
    if (!isPotentialLicenseField(fieldKey, value)) {
      continue;
    }

    licenses.push(...parseLicenseField(fieldKey, value));
  }

  return licenses;
}

function collectLicensesFromCustomFieldEntries(
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

type ContactCandidate = {
  id?: string | null;
  email?: string | null;
  customFields?: unknown;
  custom_fields?: unknown;
  fields?: unknown;
  dateUpdated?: string | null;
  updatedAt?: string | null;
  dateAdded?: string | null;
  createdAt?: string | null;
};

function normalizeContactList(payload: unknown): ContactCandidate[] {
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

function normalizeCustomFields(
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

async function fetchContactsForEmail(normalisedEmail: string): Promise<ContactCandidate[]> {
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
    const idLookup = contactCustomFieldIdMap;

    const aggregatedLicenses: GhlLicenseRecord[] = [];

    if (Array.isArray(rawRecord.customFields)) {
      aggregatedLicenses.push(
        ...collectLicensesFromCustomFieldEntries(rawRecord.customFields as Array<Record<string, unknown>>, idLookup),
      );
    }

    if (Array.isArray(rawRecord.custom_fields)) {
      aggregatedLicenses.push(
        ...collectLicensesFromCustomFieldEntries(rawRecord.custom_fields as Array<Record<string, unknown>>, idLookup),
      );
    }

    if (Array.isArray(rawRecord.fields)) {
      aggregatedLicenses.push(
        ...collectLicensesFromCustomFieldEntries(rawRecord.fields as Array<Record<string, unknown>>, idLookup),
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
