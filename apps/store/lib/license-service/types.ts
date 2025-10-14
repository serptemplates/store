export interface LicenseLookupInput {
  email: string;
  offerId: string | null;
  orderId: string;
  source: string;
}

export interface LicenseRecord {
  licenseKey: string;
  status?: string | null;
  url?: string | null;
  raw?: unknown;
}

export interface LicenseCreationInput {
  id: string;
  provider: string;
  providerObjectId?: string | null;
  userEmail: string;
  tier?: string | null;
  entitlements?: string[];
  features?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  status?: string;
  eventType?: string;
  amount?: number | null;
  currency?: string | null;
  expiresAt?: string | number | null;
  rawEvent?: unknown;
}

export interface LicenseCreationResult {
  action: string | null;
  licenseId: string | null;
  licenseKey: string | null;
  raw: unknown;
}

export interface LicenseRevocationInput {
  eventId: string;
  provider: string;
  providerObjectId?: string | null;
  userEmail: string;
  tier?: string | null;
  entitlements?: string[];
  features?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  amount?: number | null;
  currency?: string | null;
  reason?: string | null;
  originalEventId?: string | null;
  rawEvent?: Record<string, unknown> | null;
}

