import logger from "@/lib/logger";

import { GHL_LOCATION_ID, ensureConfigured } from "./config";
import { ghlRequest } from "./http";
import type {
  CustomFieldInput,
  OpportunityParams,
  UpsertContactParams,
  UpsertContactResponse,
} from "./types";

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

export async function createOpportunity(params: OpportunityParams): Promise<void> {
  ensureConfigured();

  const payload: Record<string, unknown> = {
    locationId: GHL_LOCATION_ID,
    contactId: params.contactId,
    pipelineId: params.pipelineId,
    pipelineStageId: params.stageId,
    name: params.name,
  };

  if (typeof params.monetaryValue === "number") {
    payload.monetaryValue = params.monetaryValue;
  }
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

export function buildCustomFieldPayload(
  map: Record<string, string> | undefined,
  context: Record<string, unknown>,
): CustomFieldInput[] {
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
