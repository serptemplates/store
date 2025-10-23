# Account License Sync on Verification

When a customer verifies their email on `/account`, we now pull their GoHighLevel (GHL) license keys and hydrate the dashboard immediately. This doc covers what runs behind the scenes and how to test it locally.

## What Happens

1. The `/api/account/verify` endpoint validates the code or magic link token.
2. After the account record is marked verified, we call `syncAccountLicensesFromGhl`.
3. The sync fetches the contact’s licenses from GHL, stores each license as an `orders` row with a synthetic `stripe_payment_intent_id` (`ghl_license:*`), and removes stale rows.
4. `/account` rebuilds purchase summaries, so the refreshed license list is visible instantly.

## Requirements

- **GHL credentials** – `GHL_AUTH_TOKEN` and `GHL_LOCATION_ID` must be set wherever the app runs (local, preview, prod).
- **Checkout database** – The Vercel Postgres/`CHECKOUT_DATABASE_URL` connection is still required because licenses are cached in the `orders` table.
- **Account session secret** – `ACCOUNT_SESSION_SECRET` (or `SESSION_SECRET`) continues to power the account cookie.

If any of these are missing, the verification flow still succeeds, but the sync step is skipped and a warning is logged.

## Local Testing Flow

1. Export the env vars above in `.env.local` and ensure Postgres is reachable.
2. Run `pnpm dev --filter @apps/store`.
3. Visit `http://localhost:3000/account` and request a verification code.
4. Submit the code (or use the `?token=` link) to trigger the sync.
5. Inspect the `orders` table – you should see `ghl_license:*` entries for each license assigned to the email.

### Admin Impersonation Shortcut

If you provide the configured `ACCOUNT_ADMIN_TOKEN`, loading `/account?impersonate=user@example.com` now triggers the same sync. This is handy for support to refresh a customer’s account without going through email verification.

## Operational Notes

- **Idempotent:** running the sync multiple times overwrites matching license rows and keeps only the active keys reported by GHL.
- **Logging:** look for `account.ghl_sync.*` logs if you need to troubleshoot.
- **Fallback:** `/account` still merges `fetchLicenseForOrder` results, so Stripe orders continue to populate even if GHL is unavailable (legacy PayPal orders are surfaced through the same path as `legacy_paypal`).
