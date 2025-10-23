/**
 * Database Schema Contracts
 *
 * Ensures database operations maintain data integrity
 * These contracts map directly to database tables and provide
 * validation for all database operations
 */

import { z } from 'zod';

// ============= Database Table Schemas =============

// checkout_sessions table
export const DBCheckoutSessionContract = z.object({
  id: z.string().uuid(),
  stripe_session_id: z.string().min(1),
  stripe_payment_intent_id: z.string().nullable(),
  offer_id: z.string().min(1),
  lander_id: z.string().nullable(),
  customer_email: z.string().email().nullable(),
  metadata: z.record(z.unknown()).default({}),
  status: z.enum(['pending', 'completed', 'failed', 'abandoned']),
  source: z.enum(['stripe', 'paypal', 'ghl', 'legacy_paypal']),
  created_at: z.date(),
  updated_at: z.date(),
});

export type DBCheckoutSession = z.infer<typeof DBCheckoutSessionContract>;

// orders table
export const DBOrderContract = z.object({
  id: z.string().uuid(),
  checkout_session_id: z.string().uuid().nullable(),
  stripe_session_id: z.string().nullable(),
  stripe_payment_intent_id: z.string().nullable(),
  stripe_charge_id: z.string().nullable(),
  offer_id: z.string().nullable(),
  lander_id: z.string().nullable(),
  customer_email: z.string().email().nullable(),
  customer_name: z.string().nullable(),
  amount_total: z.number().int().nullable(),
  currency: z.string().length(3).nullable(),
  metadata: z.record(z.unknown()).default({}),
  payment_status: z.string().nullable(),
  payment_method: z.string().nullable(),
  source: z.enum(['stripe', 'paypal', 'ghl', 'legacy_paypal']),
  created_at: z.date(),
  updated_at: z.date(),
});

export type DBOrder = z.infer<typeof DBOrderContract>;

// webhook_logs table
export const DBWebhookLogContract = z.object({
  id: z.string().uuid(),
  payment_intent_id: z.string().nullable(),
  stripe_session_id: z.string().nullable(),
  event_type: z.string(),
  offer_id: z.string().nullable(),
  lander_id: z.string().nullable(),
  status: z.enum(['success', 'error', 'pending']),
  message: z.string().nullable(),
  metadata: z.record(z.unknown()).default({}),
  attempts: z.number().int().min(1).default(1),
  created_at: z.date(),
  updated_at: z.date(),
});

export type DBWebhookLog = z.infer<typeof DBWebhookLogContract>;

// ============= Database Query Contracts =============

// Insert checkout session
export const DBInsertCheckoutSessionContract = z.object({
  id: z.string().uuid().optional(), // Auto-generated if not provided
  stripe_session_id: z.string().min(1),
  stripe_payment_intent_id: z.string().nullable().optional(),
  offer_id: z.string().min(1),
  lander_id: z.string().nullable().optional(),
  customer_email: z.string().email().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
  status: z.enum(['pending', 'completed', 'failed', 'abandoned']).optional(),
  source: z.enum(['stripe', 'paypal', 'ghl', 'legacy_paypal']).optional(),
});

export type DBInsertCheckoutSession = z.infer<typeof DBInsertCheckoutSessionContract>;

// Update checkout session
export const DBUpdateCheckoutSessionContract = z.object({
  stripe_payment_intent_id: z.string().nullable().optional(),
  customer_email: z.string().email().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
  status: z.enum(['pending', 'completed', 'failed', 'abandoned']).optional(),
  updated_at: z.date().optional(),
});

export type DBUpdateCheckoutSession = z.infer<typeof DBUpdateCheckoutSessionContract>;

// Insert order
export const DBInsertOrderContract = z.object({
  id: z.string().uuid().optional(),
  checkout_session_id: z.string().uuid().nullable().optional(),
  stripe_session_id: z.string().nullable().optional(),
  stripe_payment_intent_id: z.string().nullable().optional(),
  stripe_charge_id: z.string().nullable().optional(),
  offer_id: z.string().nullable().optional(),
  lander_id: z.string().nullable().optional(),
  customer_email: z.string().email().nullable().optional(),
  customer_name: z.string().nullable().optional(),
  amount_total: z.number().int().nullable().optional(),
  currency: z.string().length(3).nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
  payment_status: z.string().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  source: z.enum(['stripe', 'paypal', 'ghl', 'legacy_paypal']).optional(),
});

export type DBInsertOrder = z.infer<typeof DBInsertOrderContract>;

// Insert webhook log
export const DBInsertWebhookLogContract = z.object({
  id: z.string().uuid().optional(),
  payment_intent_id: z.string().nullable().optional(),
  stripe_session_id: z.string().nullable().optional(),
  event_type: z.string(),
  offer_id: z.string().nullable().optional(),
  lander_id: z.string().nullable().optional(),
  status: z.enum(['success', 'error', 'pending']),
  message: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
  attempts: z.number().int().min(1).optional(),
});

export type DBInsertWebhookLog = z.infer<typeof DBInsertWebhookLogContract>;

// ============= Query Result Contracts =============

export const DBQueryResultContract = z.object({
  rows: z.array(z.record(z.unknown())),
  rowCount: z.number(),
  command: z.string(),
});

export type DBQueryResult<T = unknown> = {
  rows: T[];
  rowCount: number;
  command: string;
};

// ============= Validation Functions =============

/**
 * Validates data before inserting into checkout_sessions table
 */
export function validateDBInsertCheckoutSession(data: unknown): DBInsertCheckoutSession {
  return DBInsertCheckoutSessionContract.parse(data);
}

/**
 * Validates data before updating checkout_sessions table
 */
export function validateDBUpdateCheckoutSession(data: unknown): DBUpdateCheckoutSession {
  return DBUpdateCheckoutSessionContract.parse(data);
}

/**
 * Validates data before inserting into orders table
 */
export function validateDBInsertOrder(data: unknown): DBInsertOrder {
  return DBInsertOrderContract.parse(data);
}

/**
 * Validates data before inserting into webhook_logs table
 */
export function validateDBInsertWebhookLog(data: unknown): DBInsertWebhookLog {
  return DBInsertWebhookLogContract.parse(data);
}

/**
 * Validates a row from checkout_sessions table
 */
export function validateDBCheckoutSession(data: unknown): DBCheckoutSession {
  return DBCheckoutSessionContract.parse(data);
}

/**
 * Validates a row from orders table
 */
export function validateDBOrder(data: unknown): DBOrder {
  return DBOrderContract.parse(data);
}

/**
 * Validates a row from webhook_logs table
 */
export function validateDBWebhookLog(data: unknown): DBWebhookLog {
  return DBWebhookLogContract.parse(data);
}

// ============= Type Guards =============

/**
 * Type guard for checkout session
 */
export function isDBCheckoutSession(data: unknown): data is DBCheckoutSession {
  try {
    DBCheckoutSessionContract.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard for order
 */
export function isDBOrder(data: unknown): data is DBOrder {
  try {
    DBOrderContract.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard for webhook log
 */
export function isDBWebhookLog(data: unknown): data is DBWebhookLog {
  try {
    DBWebhookLogContract.parse(data);
    return true;
  } catch {
    return false;
  }
}

// ============= Data Transformation =============

/**
 * Convert snake_case database fields to camelCase
 */
export function dbToCamelCase<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

/**
 * Convert camelCase fields to snake_case for database
 */
export function camelToSnakeCase<T extends Record<string, unknown>>(data: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}
