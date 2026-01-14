# Checkout Overview

## Summary

The store uses internal checkout routes for every product CTA. Product pages route to `/checkout/<slug>`, and the server-side handler creates a Stripe Checkout Session using product JSON + Stripe metadata. Post-purchase processing happens in the Stripe webhook and is shared with the `/checkout/success` fallback path for local/dev.

## Checkout entry points

- `/checkout/<slug>` is the primary CTA target. The route handler lives at `apps/store/app/checkout/[slug]/route.ts`.
- Product CTAs are resolved from product JSON and mapped by `useProductCheckoutCta` so every live product drives the internal checkout flow.
- Pre-release products trigger the waitlist modal instead of checkout.
<<<<<<< HEAD
=======
- Use `apps/store/lib/routes.ts` for checkout path construction and `apps/store/lib/products/product-urls.ts` for canonical product URLs.
>>>>>>> 34aba1f4 (clean up dry up store repo)

## Post-purchase processing

The Stripe webhook (`apps/store/app/api/stripe/webhook/route.ts`) is the source of truth for fulfillment. It delegates to `apps/store/lib/payments/stripe-webhook/events/checkout-session-completed.ts`, which:

- Persists checkout sessions and orders via `@/lib/checkout`.
- Resolves entitlements from the offer slug and line item metadata, with bundle expansion when required.
- Grants serp-auth entitlements via `@/lib/serp-auth/entitlements` (best-effort with retries).
- Syncs GoHighLevel contact metadata via `@/lib/ghl-client` (with retry/backoff).
- Notifies Crisp via `@/lib/crisp/sync`.
- Optionally calls the license service if `LICENSE_ADMIN_URL` + token are configured.

The `/checkout/success` page uses `apps/store/app/checkout/success/actions.ts` to replay the same fulfillment logic in local/dev when webhooks are not available. It retrieves the Stripe session directly and then calls `processFulfilledOrder`.

## Entitlements and serp-auth

- Entitlements are the primary access signal for customer permissions.
- The webhook resolves entitlements and posts them to `SERP_AUTH_BASE_URL` (default `https://auth.serp.co`) using `INTERNAL_ENTITLEMENTS_TOKEN` or `SERP_AUTH_INTERNAL_SECRET`.
- Entitlements are stored in order metadata (`license_entitlements_resolved`) and used for serp-auth grants.

## License service (legacy)

The license service is optional and enabled only when `LICENSE_ADMIN_URL` plus a token are configured. If enabled, each completed order posts a `LicenseProviderPurchase` payload to the admin endpoint, and the response is stored on the order metadata.

## Related docs

- `docs/architecture/payments-stripe-webhook.md`
- `docs/architecture/GHL-INTEGRATION-STATUS.md`
- `apps/store/data/README.md`
