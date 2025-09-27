/**
 * Checkout Data Contracts
 *
 * Defines the shape of data flowing through the checkout system
 * These contracts ensure type safety and data validation across:
 * - Stripe webhook payloads
 * - Database records
 * - GHL sync data
 * - API responses
 */

import { z } from 'zod';

// ============= Core Checkout Session Contract =============
export const CheckoutSessionContract = z.object({
  id: z.string().uuid(),
  stripeSessionId: z.string().startsWith('cs_'),
  stripePaymentIntentId: z.string().startsWith('pi_').nullable(),
  offerId: z.string().min(1),
  landerId: z.string().nullable(),
  customerEmail: z.string().email().nullable(),
  metadata: z.record(z.unknown()),
  status: z.enum(['pending', 'completed', 'failed', 'abandoned']),
  source: z.enum(['stripe', 'paypal']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CheckoutSession = z.infer<typeof CheckoutSessionContract>;

// ============= Checkout Creation Request =============
export const CheckoutCreateRequestContract = z.object({
  offerId: z.string().min(1, "offerId is required"),
  quantity: z.number().int().min(1).max(10).optional().default(1),
  mode: z.enum(["payment", "subscription"]).optional(),
  clientReferenceId: z.string().optional(),
  affiliateId: z.string().min(1).optional(),
  metadata: z.record(z.string()).optional(),
  customer: z.object({
    email: z.string().email("Invalid email"),
    name: z.string().max(120).optional(),
    phone: z.string().max(32).optional(),
  }).optional(),
});

export type CheckoutCreateRequest = z.infer<typeof CheckoutCreateRequestContract>;

// ============= Order Contract =============
export const OrderContract = z.object({
  id: z.string().uuid(),
  checkoutSessionId: z.string().uuid().nullable(),
  stripeSessionId: z.string().nullable(),
  stripePaymentIntentId: z.string().nullable(),
  stripeChargeId: z.string().nullable(),
  offerId: z.string().nullable(),
  landerId: z.string().nullable(),
  customerEmail: z.string().email().nullable(),
  customerName: z.string().nullable(),
  amountTotal: z.number().int().nullable(),
  currency: z.string().length(3).nullable(),
  metadata: z.record(z.unknown()),
  paymentStatus: z.string().nullable(),
  paymentMethod: z.string().nullable(),
  source: z.enum(['stripe', 'paypal']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Order = z.infer<typeof OrderContract>;

// ============= Checkout Session Update =============
export const CheckoutSessionUpdateContract = z.object({
  paymentIntentId: z.string().optional(),
  status: z.enum(['pending', 'completed', 'failed', 'abandoned']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CheckoutSessionUpdate = z.infer<typeof CheckoutSessionUpdateContract>;

// ============= GHL Sync Metadata =============
export const GHLSyncMetadataContract = z.object({
  ghlSyncedAt: z.string().datetime().optional(),
  ghlContactId: z.string().optional(),
  ghlOpportunityId: z.string().optional(),
  ghlError: z.string().optional(),
  ghlSyncAttempts: z.number().int().optional(),
});

export type GHLSyncMetadata = z.infer<typeof GHLSyncMetadataContract>;

// ============= Payment Success Data =============
export const PaymentSuccessDataContract = z.object({
  sessionId: z.string(),
  paymentIntentId: z.string(),
  amountTotal: z.number().int(),
  currency: z.string(),
  customerEmail: z.string().email(),
  customerName: z.string().optional(),
  offerId: z.string(),
  affiliateId: z.string().optional(),
  metadata: z.record(z.unknown()),
});

export type PaymentSuccessData = z.infer<typeof PaymentSuccessDataContract>;

// ============= Validation Functions =============

/**
 * Validates checkout session data
 * @throws {z.ZodError} if validation fails
 */
export function validateCheckoutSession(data: unknown): CheckoutSession {
  return CheckoutSessionContract.parse(data);
}

/**
 * Validates checkout creation request
 * @throws {z.ZodError} if validation fails
 */
export function validateCheckoutRequest(data: unknown): CheckoutCreateRequest {
  return CheckoutCreateRequestContract.parse(data);
}

/**
 * Validates order data
 * @throws {z.ZodError} if validation fails
 */
export function validateOrder(data: unknown): Order {
  return OrderContract.parse(data);
}

/**
 * Type guard for checking if metadata contains GHL sync data
 */
export function hasGHLSyncData(metadata: Record<string, unknown>): boolean {
  return !!(metadata.ghlSyncedAt || metadata.ghlContactId || metadata.ghlError);
}

/**
 * Extract GHL sync metadata from general metadata
 */
export function extractGHLSyncMetadata(metadata: Record<string, unknown>): GHLSyncMetadata {
  return GHLSyncMetadataContract.parse({
    ghlSyncedAt: metadata.ghlSyncedAt,
    ghlContactId: metadata.ghlContactId,
    ghlOpportunityId: metadata.ghlOpportunityId,
    ghlError: metadata.ghlError,
    ghlSyncAttempts: metadata.ghlSyncAttempts,
  });
}