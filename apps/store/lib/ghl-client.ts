import { setTimeout as sleep } from "node:timers/promises";

import logger from "@/lib/logger";

const GHL_BASE_URL = (process.env.GHL_API_BASE_URL ?? "https://services.leadconnectorhq.com").replace(/\/$/, "");
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_AUTH_TOKEN = process.env.GHL_PAT_LOCATION ?? process.env.GHL_API_TOKEN;
const GHL_API_VERSION = process.env.GHL_API_VERSION ?? "2021-07-28";

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
  throw new GhlRequestError(`GHL request failed with status ${response.status}`, response.status, body);
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
    body.customField = params.customFields.map((field) => ({ id: field.id, value: field.value }));
  }

  try {
    const result = await ghlRequest<{ contact?: { id?: string } }>("/contacts/upsert", {
      method: "POST",
      body: JSON.stringify(body),
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
    stageId: params.stageId,
    name: params.name,
  };

  if (typeof params.monetaryValue === "number") {
    payload.monetaryValue = params.monetaryValue;
  }
  if (params.currency) payload.currency = params.currency.toUpperCase();
  if (params.status) payload.status = params.status;
  if (params.source) payload.source = params.source;
  if (params.tags && params.tags.length > 0) payload.tags = params.tags;
  if (params.customFields && params.customFields.length > 0) {
    payload.customField = params.customFields.map((field) => ({ id: field.id, value: field.value }));
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
};

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
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key) => {
    const value = context[key as keyof typeof context];
    return value === undefined || value === null ? "" : String(value);
  }) || fallback;
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
    firstName,
    lastName,
    affiliateId: affiliateIdValue,
    amountDecimal: context.amountTotal != null ? context.amountTotal / 100 : undefined,
  };

  const contactCustomFields = buildCustomFieldPayload(config.contactCustomFieldIds, {
    ...baseContext,
  });

  const affiliateFieldId = process.env.GHL_AFFILIATE_FIELD_ID;
  if (affiliateFieldId && affiliateIdValue) {
    contactCustomFields.push({ id: affiliateFieldId, value: affiliateIdValue });
  }

  const contactResult = await upsertContact({
    email: context.customerEmail,
    firstName,
    lastName,
    phone: context.customerPhone ?? undefined,
    source: config.source ?? "Stripe Checkout",
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
