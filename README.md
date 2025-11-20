# @serpcompany/payments

Internal payment adapter package for SERP projects. Provides Stripe/PayPal/Whop adapters, credential registry, provider metadata for toggle UIs, and shared helpers.

## Install

1) Auth to GitHub Packages (project-local `.npmrc` recommended):
```
@serpcompany:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```
Use a PAT with `read:packages` (and `write:packages` only when publishing).

2) Install:
```
pnpm add @serpcompany/payments
```

3) If using Next.js, add to `transpilePackages`:
```js
// next.config.mjs
const nextConfig = {
  transpilePackages: ["@serpcompany/payments"],
};
export default nextConfig;
```

## What’s inside

- Adapters: `stripeCheckoutAdapter`, `paypalCheckoutAdapter`, `whopCheckoutAdapter`, placeholder adapters for Easy Pay Direct and LemonSqueezy.
- Registry helpers: `defaultAdapters`, `getAdapter`, `createCheckoutSession`.
- Credential registry: `payment-accounts.ts` (env var aliases for Stripe/PayPal).
- Helpers: `stripe`, `stripe-environment`, `paypal/api`, `metadata` utilities.
- Provider metadata: `listAvailableProviders()`, `requiredFieldsForProvider(id)` for toggle/config UIs.
- Logger bridge: `setPaymentsLogger` (defaults to console-safe logging).

## Quick start

```ts
import {
  defaultAdapters,
  getAdapter,
  type CheckoutRequest,
} from "@serpcompany/payments";
import { setPaymentsLogger } from "@serpcompany/payments/logger";
import appLogger from "./logger"; // your logger

setPaymentsLogger(appLogger);

const adapter = getAdapter("stripe", defaultAdapters);

const request: CheckoutRequest = {
  slug: "my-offer",
  mode: "payment",
  quantity: 1,
  metadata: { product_slug: "my-offer" },
  successUrl: "https://example.com/success",
  cancelUrl: "https://example.com/cancel",
  price: { id: "price_123", productName: "My Offer" },
  paymentAccountAlias: "primary",
  providerConfig: {
    provider: "stripe",
    stripe: { price_id: "price_123" },
  },
};

const session = await adapter.createCheckout(request);
// => { provider, redirectUrl, sessionId, providerSessionId }
```

## Config & env

- Update `src/payment-accounts.ts` if your env var names differ (Stripe/PayPal aliases).
- Stripe mode, test/live selection, and webhook secrets are resolved via `stripe-environment`.
- PayPal credentials resolved via `paypal/api` using the registry.

## Provider metadata (for toggle UI)

```ts
import {
  listAvailableProviders,
  requiredFieldsForProvider,
} from "@serpcompany/payments";

const providers = listAvailableProviders(); // ids, labels, fields
const stripeFields = requiredFieldsForProvider("stripe");
```

## Testing

- Stripe adapter has test hooks:
```ts
import {
  setStripeCheckoutDependencies,
  resetStripeCheckoutDependencies,
} from "@serpcompany/payments/providers/stripe/checkout";

// In tests, mock getStripeClient/resolvePriceForEnvironment:
setStripeCheckoutDependencies({ getStripeClient: mockFn, resolvePriceForEnvironment: mockFn });
// reset after tests
resetStripeCheckoutDependencies();
```

## Publishing (maintainers)

- Bump version in `package.json`.
- Ensure `.npmrc` has write token.
- `pnpm publish --access public --no-git-checks`

---

Adjust any env aliasing in `payment-accounts.ts` as needed for each project.
