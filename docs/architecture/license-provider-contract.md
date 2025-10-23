# License Provider Contract

This project connects to the universal licensing service that lives in
[`serpcompany/serp-license-key-management`](../serp-license-key-management).
The admin API exposed by that worker expects payloads that match the
`PurchaseProcessingInput` contract defined in that repository. To keep the
two projects in sync we document – and validate – the request/response
shapes inside this codebase.

## Request payload

The payload we POST to `LICENSE_ADMIN_URL` is validated against
`apps/store/lib/contracts/license-provider.ts#LicenseProviderPurchaseSchema`.
It normalises casing and guarantees the presence of all required fields:

```ts
export interface LicenseProviderPurchase {
  id: string;                     // event id (Stripe evt_ / legacy PayPal order id)
  provider: string;               // e.g. "stripe", "legacy_paypal"
  providerObjectId: string | null;// payment intent / subscription / capture id
  eventType: string;              // webhook event name
  status: "completed" | "refunded" | "cancelled" | "failed";
  amount: number | null;          // major units (17.00 => 17)
  currency: string | null;        // lower-case ISO 4217 (e.g. "usd")
  userEmail: string | null;       // customer email if present
  tier: string;                   // license tier identifier (defaults to provider)
  entitlements: string[];         // unique, non-empty entitlement slugs
  features: Record<string, unknown>; // feature flags / config
  expiresAt?: number | null;      // optional unix timestamp
  metadata: Record<string, unknown>; // forwarded order metadata
  rawEvent: unknown;              // compact breadcrumb for audit/debug
}
```

Normalisation ensures `entitlements` are unique, `currency` is lower-case and
`rawEvent` always contains at least a `source`. When new provider fields are
required, update the schema first; any mismatch will surface during local
development.

## Response payload

Responses from the admin endpoint are parsed with
`LicenseProviderResponseSchema` and must resolve to:

```ts
type LicenseProviderResponse =
  | { action: "created"; licenseId: string; licenseKey: string }
  | { action: "updated" | "none"; licenseId: string | null; licenseKey: string | null };
```

Unexpected shapes trigger a `license_service.response_unexpected_shape` log so
we can harden the contract without silently dropping data.

## Source of truth

The submodule `serp-license-key-management` (checked out at
`./serp-license-key-management`) remains the canonical implementation of the
license service. Any API changes there must be reflected in the schema above
and this document. Running the local test suite
(`pnpm --filter @apps/store test -- __tests__/license-service.test.ts`) will
exercise the normalised payload and keep the integration honest.
