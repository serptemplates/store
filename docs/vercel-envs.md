# Vercel Environment Variables

Reference for configuring the Vercel project. Replace all placeholder values with real credentials stored in Stripe, GoHighLevel, or Slack.

```env
########################################
# Production (live traffic)
########################################
NEXT_PUBLIC_CHECKOUT_URL=https://store.serp.co/api/checkout/session
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx_replace_me
STRIPE_SECRET_KEY=sk_live_xxx_replace_me
STRIPE_WEBHOOK_SECRET=whsec_live_xxx_replace_me
STRIPE_CHECKOUT_PAYMENT_METHODS=card

########################################
# Preview / Branch Deploys (test mode)
########################################
NEXT_PUBLIC_CHECKOUT_URL=https://serp-store.vercel.app/api/checkout/session
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx_replace_me
STRIPE_SECRET_KEY_TEST=sk_test_xxx_replace_me
STRIPE_WEBHOOK_SECRET_TEST=whsec_test_xxx_replace_me
# Include paypal here only if the Stripe account has the feature enabled
STRIPE_CHECKOUT_PAYMENT_METHODS=card
# Optional secondary test webhook secret (only if you maintain it)
# STRIPE_WEBHOOK_SECRET_STAGING=whsec_staging_xxx_replace_me

########################################
# Shared across all environments
########################################
SITE_CONFIG_PATH=../sites/apps.serp.co/site.config.json
GHL_API_BASE_URL=https://services.leadconnectorhq.com
GHL_PAT_LOCATION=pit_xxx_replace_me
GHL_LOCATION_ID=XM0gbS5U3qNXtUksyJ6o
SLACK_ALERT_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz
# Optional restricted Stripe key for read-only scripts
# STRIPE_SECRET_KEY_RESTRICTED=rk_test_or_live_xxx_replace_me
```

## Notes

- Replace each `xxx_replace_me` value with the correct credential when entering it into Vercel.
- Keep live and test webhook endpoints separate in Stripe so signing secrets stay isolated.
- After updating variables in Vercel, redeploy so both server and client bundles pick up the changes.
- Set `STRIPE_CHECKOUT_PAYMENT_METHODS` to `card` unless your Stripe account has PayPal enabled; add `paypal` only after Stripe confirms access.
- Ensure every `stripe.price_id` in `apps/store/data/products/*.yaml` points at the correct mode (live vs test) before enabling real payments.
