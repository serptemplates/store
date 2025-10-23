# store.serp.co Cutover Plan

This documents how to launch the new Stripe-powered store alongside the existing GoHighLevel site and switch traffic once everything is verified.

## 1. Stage the new store

1. **Create a staging subdomain** – e.g. `next-store.serp.co`.
   - Add a CNAME record pointing the subdomain at the hosting provider (Vercel/Netlify/Render).

2. **Deploy the lander template** (the dynamic version, not the static export) to the staging host.
   - Ensure the project exposes `/api/stripe/webhook` (for Stripe Payment Links) and `/api/paypal/*` routes if PayPal is enabled.
   - Use Stripe **test** keys (`STRIPE_SECRET_KEY_TEST`, `STRIPE_PUBLISHABLE_KEY_TEST`) and dedicated `STRIPE_WEBHOOK_SECRET_TEST`.
   - Set GHL env vars to a staging location or a low-risk production location with test tags.
   - Configure `OPS_ALERT_WEBHOOK_URL` so Slack alerts fire during testing.

3. **Test end-to-end**
   - Visit `https://next-store.serp.co/<product>` and click the checkout CTA. Stripe Checkout should open with PayPal inside Stripe (card + PayPal).
   - Complete a test payment (4242 card etc.) and confirm:
     - Stripe emits `checkout.session.completed` / `payment_intent.succeeded` events.
     - Our webhook handler logs to `webhook_logs` and triggers GHL sync (check contact/opportunity in the staging location).
     - Slack alert triggers after repeated failures (you can force an error by revoking the GHL token temporarily).

4. **Optional: live smoke test**
   - Switch the staging deployment to Stripe live keys temporarily and run a low-dollar ($1) internal order to ensure live webhooks work end-to-end.

## 2. Prepare production cutover

1. Populate the staging app with the production env variables:
   - `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
   - GHL production PAT, location ID, etc.
   - `OPS_ALERT_WEBHOOK_URL` (points at the real alert channel).

2. Lower the DNS TTL for `store.serp.co` ahead of time (e.g., 300 seconds) so the switch propagates quickly.

3. Keep the current GoHighLevel instance available on a backup subdomain (e.g., `store-ghl.serp.co`) for rollback. Update internal links to use the backup domain once the cutover starts.

## 3. Switch traffic

1. Update the DNS record for `store.serp.co` to point to the new host (Vercel/Netlify/etc.).
2. Verify that the TLS certificate covers the domain (provision via the provider before changing DNS to reduce downtime).
3. Watch the new store once DNS has propagated:
   - Run through an internal purchase.
   - Monitor Stripe dashboard for new events, confirm they’re hitting the new webhook URL.
   - Monitor Slack alerts for failures.

## 4. After go-live

1. Once comfortable, disable purchase links on the old GHL site or redirect `/` on the backup domain to the new store.
2. Update documentation/Runbooks to note the new platform.
3. Remove temporary staging Stripe keys or revert staging env back to test mode for future work.

## Supporting scripts

- **Main store** – deploy `@apps/store` (without `STATIC_EXPORT`) to the staging/promotion host. The HERO CTA now scrolls to `#pricing` and the pricing CTA opens the configured Stripe or GHL Payment Link in a new tab.

## Rollback plan

- Restore the DNS record back to GoHighLevel (`store-ghl.serp.co`) if an issue occurs.
- Keep the old environment active for 24–48 hours for quick recovery.
- Use Stripe dashboard to pause webhook events if necessary, then revert environment variables.

## Checklist recap

- [ ] Staging deployment with Stripe/GHL test keys.
- [ ] Automated tests completed (`pnpm typecheck`, optional QA).
- [ ] Live env variables inserted into staging app.
- [ ] DNS TTL lowered.
- [ ] Go-live dry run executed.
- [ ] DNS switched.
- [ ] Post-launch monitoring complete.
- [ ] Documentation updated & old store retired.
