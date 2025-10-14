const cleanTrailingSlash = (value: string): string => value.replace(/\/$/, "");

export const ADMIN_URL = cleanTrailingSlash(
  process.env.LICENSE_ADMIN_URL ?? process.env.LICENSE_SERVICE_ADMIN_URL ?? "",
);

export const ADMIN_TOKEN =
  process.env.LICENSE_KEY_ADMIN_API_KEY ?? process.env.LICENSE_ADMIN_API_KEY ?? "";

export const ADMIN_TIMEOUT = Number(process.env.LICENSE_ADMIN_TIMEOUT_MS ?? 5000);

export const ADMIN_PROVIDER = process.env.LICENSE_ADMIN_PROVIDER ?? null;

export const ADMIN_EVENT_TYPE = process.env.LICENSE_ADMIN_EVENT_TYPE ?? null;

export const ADMIN_RAW_EVENT_SOURCE =
  process.env.LICENSE_ADMIN_RAW_EVENT_SOURCE ?? "store.checkout";

export const ADMIN_PROVIDER_OBJECT_PREFIX =
  process.env.LICENSE_ADMIN_PROVIDER_OBJECT_PREFIX ?? "order";

export const LOOKUP_URL = process.env.LICENSE_SERVICE_URL ?? "";

export const LOOKUP_TOKEN =
  process.env.LICENSE_SERVICE_TOKEN ?? process.env.LICENSE_SERVICE_API_KEY ?? "";

export const LOOKUP_TIMEOUT = Number(process.env.LICENSE_SERVICE_TIMEOUT_MS ?? 5000);

