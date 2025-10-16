# Upsell Post-Purchase Checklist

Quick checklist to confirm the “Unlock Every Downloader” upsell (and future bumps) flows through every system after checkout.

## 1. Stripe Dashboard
- Open the Checkout Session (test or live).
- Confirm metadata:
  - `orderBumpId`, `orderBumpSelected`, `orderBumpUnitCents`, `orderBumpDisplayPrice`.
  - `checkoutTotalWithOrderBumpCents` and `checkoutTotalWithoutOrderBumpCents`.
  - Coupon metadata (`couponAdjustedTotalCents`, etc.) when applicable.
- Ensure the Payment Intent or Charge includes the upsell amount in its breakdown.

## 2. PayPal Dashboard
- Locate the order (test sandbox or live).
- Verify the order total equals product + upsell.
- Check PayPal’s “Custom ID” or notes for `orderBumpId` (we pass the slug in `custom_id`).
- Make sure PayPal metadata (available via webhooks) includes the same fields we emit.

## 3. Checkout Session Store (internal)
- Look up the `checkout_sessions` record (Stripe session ID or `paypal_<orderId>`).
- Confirm metadata mirrors the dashboard fields above.
- Ensure `source` is `stripe` or `paypal` so downstream jobs can branch accordingly.

## 4. GoHighLevel (if used)
- In both live and test mode, open the product/offer:
  - Verify the Stripe live/test price IDs match the YAML.
  - In the pipeline/opportunity created by checkout, check custom fields for upsell metadata (orderBump… entries).

## 5. Fulfilment / Licensing
- Run the license processing job (or trigger the test webhook).
- Confirm that the upsell tag (`purchase-serp-downloaders-bundle`) is applied when the bump is selected.
- Check that “bundle” entitlements are granted only if `orderBumpSelected === "true"`.

## 6. Email & Receipts
- Review the order confirmation email and any GHL automations:
  - The upsell should be listed as a line item or at least noted in the body.
  - Ensure dollar amounts line up with Stripe/PayPal totals.

## 7. Analytics & Reporting
- In PostHog/Segment, confirm events include `orderBumpSelected` and price fields.
- Update dashboards to filter/slice on upsell attachment rate.

## Smoke Test Template
1. Run Stripe test checkout with upsell off + on.
2. Run PayPal sandbox checkout with upsell off + on.
3. Inspect metadata + fulfilment artefacts per steps above.
4. Document results in release notes or QA sheet.
