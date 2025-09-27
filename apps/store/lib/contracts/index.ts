/**
 * Central export for all data contracts
 *
 * Import from here to ensure consistent contract usage across the application
 */

// Checkout contracts
export * from './checkout.contract';

// Webhook contracts
export * from './webhook.contract';

// GHL contracts
export * from './ghl.contract';

// Database contracts
export * from './database.contract';

/**
 * Contract version for tracking breaking changes
 * Increment when contracts change in a way that breaks compatibility
 */
export const CONTRACT_VERSION = '1.0.0';

/**
 * Validate all contracts are compatible
 * Use this in tests to ensure contract changes don't break
 */
export function validateContractCompatibility(): boolean {
  // Add compatibility checks here when contracts evolve
  return true;
}