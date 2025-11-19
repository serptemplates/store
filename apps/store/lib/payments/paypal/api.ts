import logger from "@/lib/logger";
import {
  DEFAULT_PAYPAL_ACCOUNT_ALIAS,
  getPayPalEnvVarCandidates,
  normalizePayPalAccountAlias,
  type PayPalAccountConfig,
} from "@/config/payment-accounts";
import { isStripeTestMode } from "@/lib/payments/stripe-environment";

export type PayPalMode = "live" | "test";

type PayPalCredentialField = "clientId" | "clientSecret" | "webhookId";

const API_BASE_URL: Record<PayPalMode, string> = {
  live: "https://api-m.paypal.com",
  test: "https://api-m.sandbox.paypal.com",
};

type CredentialLookupResult = {
  value: string;
  resolvedAlias: string;
  isFallback: boolean;
};

function resolveEnvValue(
  alias: string | null | undefined,
  field: PayPalCredentialField,
  mode: PayPalMode,
): CredentialLookupResult | null {
  const normalizedAlias =
    alias && alias.trim().length > 0 ? normalizePayPalAccountAlias(alias) : DEFAULT_PAYPAL_ACCOUNT_ALIAS;
  const { values, resolvedAlias, isFallback } = getPayPalEnvVarCandidates(normalizedAlias, field, mode);
  for (const envName of values) {
    const value = process.env[envName];
    if (typeof value === "string" && value.trim().length > 0) {
      return {
        value: value.trim(),
        resolvedAlias,
        isFallback,
      };
    }
  }
  return null;
}

function requireEnvValue(alias: string | null | undefined, field: PayPalCredentialField, mode: PayPalMode): {
  value: string;
  resolvedAlias: string;
} {
  const result = resolveEnvValue(alias, field, mode);
  if (result?.value) {
    if (result.isFallback) {
      logger.warn("paypal.account_alias_fallback", {
        requestedAlias: alias ?? null,
        resolvedAlias: result.resolvedAlias,
        field,
      });
    }
    return {
      value: result.value,
      resolvedAlias: result.resolvedAlias,
    };
  }
  throw new Error(
    `Missing PayPal credential for field "${field}" in ${
      mode === "test" ? "sandbox" : "live"
    } mode (alias: ${alias ?? "default"})`,
  );
}

type AccessTokenCacheValue = {
  token: string;
  expiresAt: number;
};

const accessTokenCache = new Map<string, AccessTokenCacheValue>();

function cacheKey(alias: string, mode: PayPalMode): string {
  return `${alias}:${mode}`;
}

async function fetchAccessToken(params: {
  clientId: string;
  clientSecret: string;
  mode: PayPalMode;
}): Promise<{ token: string; expiresIn: number }> {
  const base = API_BASE_URL[params.mode];
  const auth = Buffer.from(`${params.clientId}:${params.clientSecret}`).toString("base64");
  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error("paypal.fetch_access_token_failed", {
      status: response.status,
      body: text,
      mode: params.mode,
    });
    throw new Error(`Failed to fetch PayPal access token (${response.status})`);
  }

  const json = (await response.json()) as { access_token: string; expires_in: number };
  if (!json.access_token) {
    throw new Error("PayPal response missing access_token");
  }

  return {
    token: json.access_token,
    expiresIn: json.expires_in ?? 300,
  };
}

export async function getPayPalAccessToken(input: {
  accountAlias?: string | null;
  mode: PayPalMode;
}): Promise<{ token: string; resolvedAlias: string }> {
  const { value: clientId, resolvedAlias } = requireEnvValue(input.accountAlias ?? null, "clientId", input.mode);
  const { value: clientSecret } = requireEnvValue(resolvedAlias, "clientSecret", input.mode);

  const key = cacheKey(resolvedAlias, input.mode);
  const cached = accessTokenCache.get(key);
  const now = Date.now();

  if (cached && cached.expiresAt > now + 30_000) {
    return { token: cached.token, resolvedAlias };
  }

  const { token, expiresIn } = await fetchAccessToken({
    clientId,
    clientSecret,
    mode: input.mode,
  });

  accessTokenCache.set(key, {
    token,
    expiresAt: now + expiresIn * 1000,
  });

  return { token, resolvedAlias };
}

async function paypalFetch<TResponse>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    accountAlias?: string | null;
    mode: PayPalMode;
    headers?: Record<string, string>;
  },
): Promise<{ json: TResponse; resolvedAlias: string }> {
  const { token, resolvedAlias } = await getPayPalAccessToken({
    accountAlias: options.accountAlias ?? null,
    mode: options.mode,
  });

  const response = await fetch(`${API_BASE_URL[options.mode]}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error("paypal.api_request_failed", {
      path,
      method: options.method ?? "GET",
      status: response.status,
      body: text,
    });
    throw new Error(`PayPal API request failed (${response.status})`);
  }

  const json = (await response.json()) as TResponse;
  return { json, resolvedAlias };
}

export type PayPalOrderCreateParams = {
  intent: "CAPTURE" | "AUTHORIZE";
  purchase_units: Array<Record<string, unknown>>;
  application_context: Record<string, unknown>;
};

export type PayPalOrder = {
  id: string;
  status: string;
  links?: Array<{ href: string; rel: string; method?: string }>;
};

export async function createPayPalOrder(input: {
  payload: PayPalOrderCreateParams;
  accountAlias?: string | null;
  mode: PayPalMode;
}): Promise<{ order: PayPalOrder; resolvedAlias: string }> {
  const { json, resolvedAlias } = await paypalFetch<PayPalOrder>("/v2/checkout/orders", {
    method: "POST",
    body: input.payload,
    accountAlias: input.accountAlias ?? null,
    mode: input.mode,
  });
  return { order: json, resolvedAlias };
}

export async function capturePayPalOrder(input: {
  orderId: string;
  accountAlias?: string | null;
  mode: PayPalMode;
}): Promise<Record<string, unknown>> {
  const { json } = await paypalFetch<Record<string, unknown>>(
    `/v2/checkout/orders/${input.orderId}/capture`,
    {
      method: "POST",
      accountAlias: input.accountAlias ?? null,
      mode: input.mode,
    },
  );
  return json;
}

export type PayPalProductPayload = {
  name: string;
  description?: string;
  type?: string;
  category?: string;
  image_url?: string;
  home_url?: string;
};

export type PayPalProduct = {
  id: string;
  name: string;
  description?: string;
};

export async function createPayPalProduct(input: {
  payload: PayPalProductPayload;
  accountAlias?: string | null;
  mode: PayPalMode;
}): Promise<{ product: PayPalProduct; resolvedAlias: string }> {
  const { json, resolvedAlias } = await paypalFetch<PayPalProduct>("/v1/catalogs/products", {
    method: "POST",
    body: input.payload,
    accountAlias: input.accountAlias ?? null,
    mode: input.mode,
  });
  return { product: json, resolvedAlias };
}

export type PayPalPlanPayload = {
  product_id: string;
  name: string;
  description?: string;
  billing_cycles: Array<Record<string, unknown>>;
  payment_preferences?: Record<string, unknown>;
  taxes?: Record<string, unknown>;
};

export type PayPalPlan = {
  id: string;
  product_id: string;
  status: string;
};

export async function createPayPalPlan(input: {
  payload: PayPalPlanPayload;
  accountAlias?: string | null;
  mode: PayPalMode;
}): Promise<{ plan: PayPalPlan; resolvedAlias: string }> {
  const { json, resolvedAlias } = await paypalFetch<PayPalPlan>("/v1/billing/plans", {
    method: "POST",
    body: input.payload,
    accountAlias: input.accountAlias ?? null,
    mode: input.mode,
  });
  return { plan: json, resolvedAlias };
}

export async function getPayPalOrderDetails(input: {
  orderId: string;
  accountAlias?: string | null;
  mode: PayPalMode;
}): Promise<Record<string, unknown>> {
  const { json } = await paypalFetch<Record<string, unknown>>(`/v2/checkout/orders/${input.orderId}`, {
    method: "GET",
    accountAlias: input.accountAlias ?? null,
    mode: input.mode,
  });
  return json;
}

export type PayPalWebhookVerificationResult = "SUCCESS" | "FAILURE";

export async function verifyPayPalWebhookSignature(input: {
  body: Record<string, unknown>;
  rawBody: string;
  transmissionId: string;
  transmissionTime: string;
  certUrl: string;
  authAlgo: string;
  transmissionSig: string;
  webhookId: string;
  accountAlias?: string | null;
  mode: PayPalMode;
}): Promise<PayPalWebhookVerificationResult> {
  const { token } = await getPayPalAccessToken({
    accountAlias: input.accountAlias ?? null,
    mode: input.mode,
  });

  const response = await fetch(`${API_BASE_URL[input.mode]}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transmission_id: input.transmissionId,
      transmission_time: input.transmissionTime,
      cert_url: input.certUrl,
      auth_algo: input.authAlgo,
      transmission_sig: input.transmissionSig,
      webhook_id: input.webhookId,
      webhook_event: input.body,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error("paypal.verify_webhook_failed", {
      status: response.status,
      body: text,
    });
    return "FAILURE";
  }

  const json = (await response.json()) as { verification_status?: PayPalWebhookVerificationResult };
  return (json.verification_status as PayPalWebhookVerificationResult) ?? "FAILURE";
}

export function resolvePayPalModeForRuntime(): PayPalMode {
  return isStripeTestMode() ? "test" : "live";
}
