# Vercel Environment Variables

Reference for configuring the Vercel project. Replace all placeholder values with real credentials stored in Stripe, GoHighLevel, or Slack.

```env
########################################
# Production (live traffic)
########################################
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx_replace_me
STRIPE_SECRET_KEY=sk_live_xxx_replace_me
STRIPE_WEBHOOK_SECRET=whsec_live_xxx_replace_me

########################################
# Preview / Branch Deploys (test mode)
########################################
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx_replace_me
STRIPE_SECRET_KEY_TEST=sk_test_xxx_replace_me
STRIPE_WEBHOOK_SECRET_TEST=whsec_test_xxx_replace_me
# Optional secondary test webhook secret (only if you maintain it)
# STRIPE_WEBHOOK_SECRET_STAGING=whsec_staging_xxx_replace_me

########################################
# Shared across all environments
########################################
SITE_CONFIG_PATH=../sites/apps.serp.co/site.config.json
GHL_API_BASE_URL=https://services.leadconnectorhq.com
GHL_PAT_LOCATION=pit_xxx_replace_me
GHL_LOCATION_ID=XM0gbS5U3qNXtUksyJ6o
GHL_AFFILIATE_FIELD_ID=contact_field_id_for_affiliate_tracking
# Optional overrides (auto-detects `contact.purchase_metadata` / `contact.license_keys_v2` when left unset)
GHL_CUSTOM_FIELD_PURCHASE_METADATA=contact_field_id_for_purchase_metadata
GHL_CUSTOM_FIELD_LICENSE_KEYS_V2=contact_field_id_for_license_keys_v2
SLACK_ALERT_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz
MONITORING_TOKEN=choose_a_random_secret
CHECKOUT_MONITOR_STALE_SESSION_MINUTES=15
CHECKOUT_MONITOR_STALE_WEBHOOK_MINUTES=10
CHECKOUT_MONITOR_WEBHOOK_LOOKBACK_HOURS=6
CHECKOUT_MONITOR_MIN_ORDERS_LOOKBACK_HOURS=24
CHECKOUT_MONITOR_MIN_ORDERS=1
# Optional restricted Stripe key for read-only scripts
# STRIPE_SECRET_KEY_RESTRICTED=rk_test_or_live_xxx_replace_me

########################################
# Shopify (classic theme storefront)
########################################
SHOPIFY_STORE_DOMAIN=serp-store-2.myshopify.com
SHOPIFY_API_TOKEN=shpat_xxx_replace_me
# Optional: surface API key/secret for CLI tooling or OAuth flows
SHOPIFY_API_KEY=shpua_xxx_replace_me
SHOPIFY_API_KEY_SECRET=shpss_xxx_replace_me
SHOPIFY_STOREFRONT_TOKEN=shpat_storefront_xxx_replace_me
# Override to match the Admin API version your store supports
SHOPIFY_ADMIN_API_VERSION=2024-04
```

## Notes

- Replace each `xxx_replace_me` value with the correct credential when entering it into Vercel.
- Keep live and test webhook endpoints separate in Stripe so signing secrets stay isolated.
- After updating variables in Vercel, redeploy so both server and client bundles pick up the changes.
- Product checkout destinations now come from Stripe or GHL Payment Links defined in `apps/store/data/products/*.yaml`; no client-side checkout endpoint URL is required.
- When running preview/test deployments, also supplying `STRIPE_SECRET_KEY` allows the app to auto-clone live prices into test mode when needed; otherwise configure test prices manually.
- Ensure every `stripe.price_id` in `apps/store/data/products/*.yaml` points at the correct mode (live vs test) before enabling real payments.
