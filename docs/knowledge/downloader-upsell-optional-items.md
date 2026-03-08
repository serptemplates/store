# Downloader Upsell Wiring

## Where the sales-page upsell comes from

For downloader product pages, the sales-page upsell is driven by `payment.stripe.optional_items` in each product JSON.

The runtime path is:

1. product JSON `payment.stripe.optional_items`
2. [`apps/store/lib/products/payment.ts`](/Users/devin/repos/projects/store/apps/store/lib/products/payment.ts)
3. [`apps/store/lib/products/offer-config.ts`](/Users/devin/repos/projects/store/apps/store/lib/products/offer-config.ts)
4. Stripe Checkout `optional_items`
5. page CTA/order bump UI

## Bundle upsell reference that was removed

The all-downloaders bundle upsell used Stripe product ID:

- `prod_TadNFo3sxzkGYb`

Removing that ID from downloader product JSONs removes the bundle upsell from the downloader sales pages and from the optional Stripe checkout items derived from those products.

## Why production could still show it later

There are two separate reintroduction paths to watch:

1. Production `main` can still serve old product JSONs until `staging` is merged and deployed.
2. Legacy automation scripts can re-apply the bundle to downloader products unless they are guarded.

The repo now blocks the automation path by:

- removing the bundle as the default target from Stripe cross-sell automation
- rejecting bundle product IDs from cross-sell env-based configuration
- hard-disabling the legacy script that re-added bundle `optional_items` to downloader JSONs

## Important distinction

There is also a separate global optional item path in `offer-config.ts`:

- `GLOBAL_OPTIONAL_ITEM_SLUGS = ["serp-vpn"]`

That is not the all-downloaders bundle. If a downloader page still shows an upsell after removing `prod_TadNFo3sxzkGYb`, check whether the remaining optional item is the VPN cross-sell instead of the bundle.
