# PayPal Integration (Legacy)

This repo still contains PayPal handlers for legacy orders and historical audits. New purchases are routed through Stripe checkout, so treat this as a reference only.

## What still exists

- Webhook handler: `apps/store/app/api/payments/paypal/webhook/route.ts`
- Success page fallback flow: `apps/store/app/checkout/success/actions.ts` (PayPal token path)
- Provider logic: `apps/store/lib/payments/providers/paypal/*`

## Env variables (if you need to replay legacy events)

The PayPal adapter resolves credentials via `@repo/payments` registry and env aliases. Typical variables include:

- `PAYPAL_CLIENT_ID__<alias>__{live,test}`
- `PAYPAL_CLIENT_SECRET__<alias>__{live,test}`
- `PAYPAL_WEBHOOK_ID__<alias>__{live,test}`

See `@repo/payments` config and `apps/store/config/payment-accounts.ts` for alias names.

## Notes

- Legacy PayPal orders are stored with `source = "paypal"` or `source = "legacy_paypal"` in the database.
- Do not add new PayPal CTAs without an explicit product decision.
