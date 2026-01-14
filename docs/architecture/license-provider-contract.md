# License Provider Contract (Legacy)

The store can post purchase events to an external license service when the admin endpoint is configured. This integration is optional and disabled when the env variables are missing.

## Enablement

The license service is enabled only when these env vars are set:

- `LICENSE_ADMIN_URL` (or `LICENSE_SERVICE_ADMIN_URL`)
- `LICENSE_KEY_ADMIN_API_KEY` (or `LICENSE_ADMIN_API_KEY`)

Optional lookup config (used when reading back license details):

- `LICENSE_SERVICE_URL`
- `LICENSE_SERVICE_TOKEN` (or `LICENSE_SERVICE_API_KEY`)

## Request payload

The payload is validated against `apps/store/lib/contracts/license-provider.ts#LicenseProviderPurchaseSchema` and sent by `createLicenseForOrder` in `apps/store/lib/license-service/creation.ts`.

```ts
export interface LicenseProviderPurchase {
  id: string;                     // event id (Stripe evt_...)
  provider: string;               // e.g. "stripe"
  providerObjectId: string | null;// payment intent / capture id
  eventType: string;              // webhook event name
  status: "completed" | "refunded" | "cancelled" | "failed";
  amount: number | null;          // major units (17.00 => 17)
  currency: string | null;        // lower-case ISO 4217 (e.g. "usd")
  userEmail: string | null;       // customer email if present
  tier: string;                   // license tier identifier
  entitlements: string[];         // unique, non-empty entitlement slugs
  features: Record<string, unknown>; // feature flags / config
  expiresAt?: number | null;      // optional unix timestamp
  metadata: Record<string, unknown>; // forwarded order metadata
  rawEvent: unknown;              // compact breadcrumb for audit/debug
}
```

## Response payload

Responses are parsed with `LicenseProviderResponseSchema` and normalized to:

```ts
type LicenseProviderResponse =
  | { action: "created"; licenseId: string; licenseKey: string }
  | { action: "updated" | "none"; licenseId: string | null; licenseKey: string | null };
```

Unexpected shapes are logged with `license_service.response_unexpected_shape` so the integration can be hardened without silent failures.

## Notes

- If the admin URL or token is missing, the license integration is skipped entirely.
- License keys are legacy; serp-auth entitlements remain the primary access model.
