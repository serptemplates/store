/**
 * GHL (GoHighLevel) Data Contracts
 *
 * Defines the shape of data for GoHighLevel integrations:
 * - Contact creation/update
 * - Opportunity management
 * - Custom field mappings
 * - Webhook responses
 */

import { z } from 'zod';

// ============= GHL Configuration Contract =============
export const GHLConfigContract = z.object({
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  workflowIds: z.array(z.string()).optional(),
  opportunityNameTemplate: z.string().optional(),
  contactCustomFieldIds: z.record(z.string()).optional(),
  opportunityCustomFieldIds: z.record(z.string()).optional(),
});

export type GHLConfig = z.infer<typeof GHLConfigContract>;

// ============= GHL Contact Contract =============
export const GHLContactContract = z.object({
  id: z.string(),
  locationId: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  name: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  address1: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  postalCode: z.string().nullable(),
  companyName: z.string().nullable(),
  website: z.string().nullable(),
  tags: z.array(z.string()).optional(),
  source: z.string().nullable(),
  customFields: z.record(z.unknown()).optional(),
  dateAdded: z.string(),
  dateUpdated: z.string(),
});

export type GHLContact = z.infer<typeof GHLContactContract>;

// ============= GHL Contact Create/Update Request =============
export const GHLContactRequestContract = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  name: z.string().optional(),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
  customFields: z.array(z.object({
    id: z.string(),
    field_value: z.unknown(),
  })).optional(),
});

export type GHLContactRequest = z.infer<typeof GHLContactRequestContract>;

// ============= GHL Opportunity Contract =============
export const GHLOpportunityContract = z.object({
  id: z.string(),
  name: z.string(),
  monetaryValue: z.number().optional(),
  pipelineId: z.string(),
  pipelineStageId: z.string(),
  assignedTo: z.string().optional(),
  status: z.enum(['open', 'won', 'lost', 'abandoned']),
  source: z.string().optional(),
  contactId: z.string(),
  locationId: z.string(),
  dateAdded: z.string(),
  dateUpdated: z.string(),
  lastStatusChangeAt: z.string().optional(),
  lastStageChangeAt: z.string().optional(),
  lastActionDate: z.string().optional(),
  customFields: z.record(z.unknown()).optional(),
});

export type GHLOpportunity = z.infer<typeof GHLOpportunityContract>;

// ============= GHL Opportunity Create Request =============
export const GHLOpportunityRequestContract = z.object({
  name: z.string(),
  pipelineId: z.string(),
  pipelineStageId: z.string(),
  contactId: z.string(),
  monetaryValue: z.number().optional(),
  status: z.enum(['open', 'won', 'lost', 'abandoned']).default('open'),
  source: z.string().optional(),
  customFields: z.array(z.object({
    id: z.string(),
    value: z.unknown(),
  })).optional(),
});

export type GHLOpportunityRequest = z.infer<typeof GHLOpportunityRequestContract>;

// ============= GHL Sync Request (Internal) =============
export const GHLSyncRequestContract = z.object({
  // Order data
  amountTotal: z.number(),
  currency: z.string(),
  customerEmail: z.string().email(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),

  // Tracking data
  affiliateId: z.string().optional(),
  offerId: z.string(),
  landerId: z.string().optional(),

  // Payment data
  paymentIntentId: z.string(),
  sessionId: z.string(),
  paymentMethod: z.string().optional(),

  // GHL configuration
  ghl: GHLConfigContract,
});

export type GHLSyncRequest = z.infer<typeof GHLSyncRequestContract>;

// ============= GHL Sync Response =============
export const GHLSyncResponseContract = z.object({
  success: z.boolean(),
  contactId: z.string().optional(),
  opportunityId: z.string().optional(),
  opportunityCreated: z.boolean().optional(),
  workflowsTriggered: z.array(z.string()).optional(),
  error: z.string().optional(),
});

export type GHLSyncResponse = z.infer<typeof GHLSyncResponseContract>;

// ============= GHL API Response Contracts =============

export const GHLAPISuccessResponseContract = z.object({
  success: z.boolean(),
  contact: GHLContactContract.optional(),
  opportunity: GHLOpportunityContract.optional(),
});

export const GHLAPIErrorResponseContract = z.object({
  success: z.literal(false),
  message: z.string(),
  error: z.string().optional(),
  statusCode: z.number().optional(),
});

export const GHLAPIResponseContract = z.union([
  GHLAPISuccessResponseContract,
  GHLAPIErrorResponseContract,
]);

export type GHLAPIResponse = z.infer<typeof GHLAPIResponseContract>;

// ============= GHL Search Response =============
export const GHLSearchResponseContract = z.object({
  contacts: z.array(GHLContactContract),
  count: z.number(),
  total: z.number().optional(),
});

export type GHLSearchResponse = z.infer<typeof GHLSearchResponseContract>;

// ============= Validation Functions =============

/**
 * Validates GHL configuration
 */
export function validateGHLConfig(data: unknown): GHLConfig {
  return GHLConfigContract.parse(data);
}

/**
 * Validates GHL contact data
 */
export function validateGHLContact(data: unknown): GHLContact {
  return GHLContactContract.parse(data);
}

/**
 * Validates GHL contact request
 */
export function validateGHLContactRequest(data: unknown): GHLContactRequest {
  return GHLContactRequestContract.parse(data);
}

/**
 * Validates GHL opportunity
 */
export function validateGHLOpportunity(data: unknown): GHLOpportunity {
  return GHLOpportunityContract.parse(data);
}

/**
 * Validates GHL sync request
 */
export function validateGHLSyncRequest(data: unknown): GHLSyncRequest {
  return GHLSyncRequestContract.parse(data);
}

/**
 * Type guard for GHL API success response
 */
export function isGHLAPISuccess(response: GHLAPIResponse): response is z.infer<typeof GHLAPISuccessResponseContract> {
  return response.success === true;
}

/**
 * Type guard for GHL API error response
 */
export function isGHLAPIError(response: GHLAPIResponse): response is z.infer<typeof GHLAPIErrorResponseContract> {
  return response.success === false;
}

/**
 * Format customer name for GHL
 */
export function formatGHLCustomerName(name?: string): { firstName?: string; lastName?: string } {
  if (!name) return {};

  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return { firstName: parts[0] };
  }

  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');

  return { firstName, lastName };
}

/**
 * Build opportunity name from template
 */
export function buildOpportunityName(
  template: string,
  data: {
    customerName?: string;
    customerEmail: string;
    offerId: string;
    amount: number;
    currency: string;
  }
): string {
  return template
    .replace('{name}', data.customerName || 'Customer')
    .replace('{email}', data.customerEmail)
    .replace('{product}', data.offerId)
    .replace('{amount}', `${data.currency.toUpperCase()} ${(data.amount / 100).toFixed(2)}`)
    .replace('{date}', new Date().toISOString().split('T')[0]);
}