# Safety Net TODO

## Baseline Safety Layer (pre-refactor blockers)
- [x] Configure a unified unit test runner (prefer Vitest) and port existing contract specs so `pnpm test` exercises `lib/contracts` and `__tests__`.
- [x] Gatekeep product/content integrity by wiring `scripts/validate-product.mjs` into the test runner and failing on schema or duplicate name issues.
- [x] Add API route tests for `/api/checkout/session` that mock Stripe and the checkout store to cover: happy path, missing offer, validation errors, and Stripe failures.
- [x] Add Stripe webhook handler tests that mock the checkout store, GHL client, and webhook logger to verify order persistence, retry logic, and alerting when sync fails.
- [x] Introduce a lightweight Playwright smoke suite (desktop only) that loads home → representative product → kicks off checkout (asserts redirect URL) against a mocked Stripe backend.
- [x] Provide an npm script (e.g. `pnpm test:safe`) and CI job that runs lint, typecheck, unit tests, content validation, and smoke tests on every branch.

## Stretch Enhancements (post-baseline)
- [ ] Expand Playwright coverage to mobile breakpoints once smoke suite is stable to replace the current multi-device responsiveness spec.
- [x] Backfill PayPal API route tests mirroring Stripe coverage and ensure dual-source checkout parity.
- [ ] Capture screenshots or DOM snapshots for key landing pages to guard against accidental layout regressions.
- [x] Add fixture-based tests for `lib/products/product` and `productToHomeTemplate` to lock critical transformations.
- [x] Wire live Stripe dry-run, Lighthouse budgets, and monitoring endpoint checks so cashflow and performance regressions fail fast.
