export type CustomFieldInput = { id: string; value: string | number | boolean };

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
  storeProductPageUrl?: string | null;
  appsProductPageUrl?: string | null;
  purchaseUrl?: string | null;
  serplyLink?: string | null;
  successUrl?: string | null;
  cancelUrl?: string | null;
  provider?: string | null;
  licenseKey?: string | null | undefined;
  licenseId?: string | null | undefined;
  licenseAction?: string | null | undefined;
  licenseEntitlements?: string[] | null | undefined;
  licenseTier?: string | null | undefined;
  licenseFeatures?: Record<string, unknown> | null | undefined;
};

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
