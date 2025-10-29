# Plan: Support Multiple GHL Tags Per Checkout

## Context

- Webhook currently falls back to the first tag (`offerConfig.ghl.tagIds[0]`) when session metadata is missing, so cross-sell tags never reach GHL.
- Need to aggregate tags from session metadata + line items + configuration and forward the full list downstream.
- Work will follow a TDD loop to prevent regressions.

## To‑Do Checklist

1. **Add failing test**
   - Extend `apps/store/tests/integration/api/stripe-webhook.test.ts`.
   - Mock `stripe.checkout.sessions.listLineItems` to return two products with different `ghl_tag` values.
   - Assert that the webhook stores both tags (e.g., `metadata.ghlTagIds === "primary,upsell"`), keeps the first tag in `metadata.ghl_tag`, and passes the full array to `syncOrderWithGhl`.

2. **Update implementation**
   - Modify `apps/store/lib/payments/stripe-webhook/events/checkout-session-completed.ts`.
   - Gather tag IDs from:
     - Existing session metadata (`ghl_tag`, `ghlTag`, `ghl_tag_ids`, `ghlTagIds`).
     - Stripe line items (price + product metadata).
     - Configured defaults (`offerConfig.ghl.tagIds`, product YAML fallback).
   - Store the array (comma-separated for metadata) and keep the first element for compatibility.
   - Pass the array through to the GHL sync config (`tagIds`).

3. **Refine tests**
   - Ensure the new test now passes.
   - Adjust existing expectations if they assumed only one tag.

4. **Run quality gates**
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test:unit`

5. **Optional validation**
   - Replay a Stripe webhook (or use manual test scripts) with a cross-sell checkout to confirm both tags reach GHL.

