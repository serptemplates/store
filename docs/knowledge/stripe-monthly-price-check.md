# Stripe monthly price check/create notes

- Use the Stripe SDK with `STRIPE_SECRET_KEY` and `STRIPE_SECRET_KEY_TEST` loaded from `.env`.
- For each product slug, read `payment.stripe.metadata.stripe_product_id` and `stripe_test_product_id`.
- List active prices and look for `currency=usd`, `unit_amount=1700`, and `recurring.interval=month`.
- If missing, create a recurring monthly price with the same amount and a clear nickname (ex: `<slug> monthly`).
- Update product JSON + price manifest with the new live/test `price_` IDs and set `payment.mode` to `subscription`.
