# Checkout Baseline – 2025-10-18

## Context
- **Date range:** _Pending – capture 30-day window once production analytics are available_
- **Environment:** Production
- **Prepared by:** Codex (needs stakeholder confirmation)

## Stripe
- **Dashboard report URL:** _Add link to Stripe → Payments → Checkout overview (filtered to 30 days)._
- **Checkout conversion:** _Pending – export CSV once dashboard access is available._
- **Abandonment rate:** _Pending – record the percentage from the same export._
- **Recovery emails sent:** _Pending – note count from Stripe recovery email metrics._
- **Export file:** _Upload the CSV to the repo or shared drive and link here._
- **Notes:** Stripe data requires live access; run the export immediately before toggling the hosted flag so we have an accurate baseline.

## Internal Checkout Data
- **Source:** `checkout_sessions` persistence + license/order completions.
- **Query:** _Add SQL or script reference used to pull checkout vs. fulfilled orders._
- **Results:** _Pending – paste aggregated counts (initiated, completed, failed, recovered)._
- **Export file:** _Attach CSV or reference to shared location._
- **Notes:** Ensure the snapshot is taken from the same date range as the Stripe export for apples-to-apples comparison.

## Additional Observations
- Hosted Checkout rollout pending baseline capture; analytics tooling (PostHog/GA) is currently unreliable, so they are omitted from this snapshot by design.
- Once Stripe + internal exports are attached, mark the Phase 0 “Metrics baseline captured” checklist item as complete.
