import { GhlConfigurationError } from "./errors";

const stripTrailingSlash = (value: string): string => value.replace(/\/$/, "");

export const RAW_GHL_API_BASE_URL =
  process.env.GHL_API_BASE_URL ?? "https://services.leadconnectorhq.com";

export const GHL_BASE_URL = stripTrailingSlash(RAW_GHL_API_BASE_URL);

export const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

export const GHL_AUTH_TOKEN =
  process.env.GHL_PAT_LOCATION ?? process.env.GHL_API_TOKEN ?? process.env.GHL_API_KEY;

export const GHL_API_VERSION = process.env.GHL_API_VERSION ?? "2021-07-28";

export const GHL_CUSTOM_FIELD_PURCHASE_METADATA = process.env.GHL_CUSTOM_FIELD_PURCHASE_METADATA;
export const GHL_CUSTOM_FIELD_LICENSE_KEYS_V2 = process.env.GHL_CUSTOM_FIELD_LICENSE_KEYS_V2;

export const DEFAULT_PURCHASE_METADATA_FIELD_KEY = "contact.purchase_metadata";
export const DEFAULT_LICENSE_KEYS_FIELD_KEY = "contact.license_keys_v2";

const parsedHost = (() => {
  try {
    return new URL(GHL_BASE_URL).hostname;
  } catch {
    return "";
  }
})();

export const isLeadConnectorHost =
  parsedHost === "leadconnectorhq.com" || parsedHost.endsWith(".leadconnectorhq.com");

const inferredV1Base = isLeadConnectorHost ? GHL_BASE_URL : `${GHL_BASE_URL}/v1`;

export const GHL_CONTACT_API_ROOT = stripTrailingSlash(
  process.env.GHL_API_V1_BASE_URL ?? inferredV1Base,
);

export function ensureConfigured(): void {
  if (!GHL_AUTH_TOKEN || !GHL_LOCATION_ID) {
    throw new GhlConfigurationError(
      "GHL credentials are not fully configured. Set GHL_PAT_LOCATION (or GHL_API_TOKEN) and GHL_LOCATION_ID.",
    );
  }
}
