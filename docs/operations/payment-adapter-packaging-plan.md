# Payment Adapter Packaging Plan

Goal: extract the payment adapter layer into a reusable internal package while keeping current behavior stable and enabling a toggle-style “enable providers” flow with clear credential requirements.

## Constraints
- No regressions to the current Store app.
- Keep existing env naming working; allow projects to provide their own naming via injected registry/credential resolvers.
- Preserve current adapter behavior (Stripe, PayPal, Whop, placeholders) while reorganizing for modularity.

## Approach
- Create `packages/payments` that exposes:
  - Core types: `CheckoutRequest/Response`, adapter contract, provider registry metadata, credential resolver interfaces.
  - A router builder that registers only the providers supplied at init.
  - Helper metadata (`listAvailableProviders`, `requiredFieldsForProvider`) to drive UI toggles/forms.
  - Default credential registry matching today’s env names for Store; projects can pass a custom registry.
- Keep per-provider code isolated (one folder per provider: checkout, webhook, env helpers if provider-specific).
- Keep the Store app mapping its `OfferConfig` → `CheckoutRequest`; only imports change to pull from the package.

## TODO (execution)
- [x] Add `packages/payments` with core types, adapter registry, credential resolver interfaces, and default registry for current env names.
- [x] Move existing adapters into the package (Stripe, PayPal, Whop, placeholders) without changing behavior; keep tests green.
- [x] Expose provider metadata helpers (`listAvailableProviders`, `requiredFieldsForProvider`) for UI toggles.
- [ ] Wire Store app to consume the package (router import, adapters registered via package init) while preserving defaults.
- [ ] Split any remaining mixed-provider files so each provider stays in its own module.
- [ ] Add/adjust typings and narrow any `unknown`/loose shapes exposed by the package surface.
- [ ] Update or add unit tests for the package surface and adapter registration; keep existing tests passing.
- [ ] Run required checks: `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:axe`, `pnpm validate:products`, headless Playwright (desktop + mobile) for checkout flow.

## Notes
- Default registry should mirror `apps/store/config/payment-accounts.ts`; apps can supply a custom registry at init to support different env keys.
- Router must remain backward-compatible with current `createCheckoutSessionForOffer` inputs to avoid UI changes.
