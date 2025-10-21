# Pre-Release CTA Waitlist Plan

## Objective
When a product YAML marks a landing page as pre-release, every primary CTA (hero button, pricing CTA, sticky bar, navigation CTA) should open `https://newsletter.serp.co/waitlist` in a new tab. This keeps the waitlist flow simple, leverages existing GoHighLevel automation, and avoids half-broken checkout links while still preserving release metadata (`status`) used elsewhere.

## Current Behaviour
- `ClientHomeView` (`apps/store/components/home/ClientHomeView.tsx:46-288`) derives `resolvedCtaHref` and always navigates to checkout/external destinations, regardless of release status.
- `HomeTemplate` (`apps/store/components/home/HomeTemplate.tsx:200-316`) pipes that href into hero links and `<PricingCta>`, so the call-to-action button navigates instead of opening the waitlist.
- `StickyProductCTA` (`apps/store/components/home/ClientHomeView.tsx:303-338`) reuses the same resolved href.
- `productToHomeTemplate` (`apps/store/lib/products/product-adapter.ts:97-220`) sets CTA text/href but does not consider a dedicated waitlist flow for pre-release products.

## Recommendations & Scope
1. **Preserve `status`, Add Optional `cta_mode`**  
   - Keep `status` for release posture (badges, filters, structured data).  
   - Introduce an optional YAML field `cta_mode` with values such as `checkout`, `external`, or `pre_release`. Default to pre-release behaviour when `status === "pre_release"` so editors do not need to set both fields.

2. **Central CTA Resolution (ClientHomeView)**  
   - Compute a single `ctaDestination` and `ctaLabel` based on `cta_mode`.  
   - For pre-release mode, set `ctaDestination` to `https://newsletter.serp.co/waitlist`, use “Get Notified” (or YAML override), and render anchors with `target="_blank"`/`rel="noopener noreferrer"`.  
   - For other modes, retain existing checkout/external logic.

3. **Template Consumers**  
   - Update `HomeTemplate` hero link and `<PricingCta>` to use the resolved destination and label without bespoke modal logic.  
   - Ensure `PricingCta` still supports internal checkout when not in pre-release mode.

4. **Sticky CTA & Navigation CTA**  
   - Pass the same resolved destination/label into `StickyProductCTA` and any nav CTA so that all touchpoints behave consistently (open waitlist URL when in pre-release mode).

5. **Product Adapter Defaults**  
   - In `productToHomeTemplate`, when the derived mode is pre-release, default `ctaText` to “Get Notified” and set `ctaHref` to the waitlist URL.  
   - Maintain existing checkout defaults for live products.

6. **Analytics Considerations**  
   - Update CTA tracking calls to report `destination: "waitlist"` (or similar) when the waitlist URL is used.  
   - Defer deeper analytics changes unless required after MVP.

7. **Testing & QA**  
   - Unit tests verifying pre-release products point CTA anchors at the waitlist URL with the correct target attributes.  
   - Manual QA: confirm waitlist URL opens in a new tab, release badges/filters remain unchanged, and live products still navigate to their checkout/external links.

## Out of Scope
- Removing or repurposing the existing `status` field.  
- Implementing a custom modal or embedding the waitlist form directly on the lander.  
- Updating hybrid/ecommerce layouts (can be handled separately if needed).

## Follow-Up Decisions
- Finalize CTA copy for the waitlist (e.g., “Join the Waitlist” vs. alternative phrasing).  
- Decide whether hybrid/ecommerce layouts should adopt the same waitlist URL behaviour.  
- Revisit analytics instrumentation once the MVP behaviour is in place.

## Implementation Checklist
- [x] Add optional `cta_mode` support to the product schema/types (defaulting to `status` when omitted).  
- [x] Update `productToHomeTemplate` to derive CTA label/destination, using the waitlist URL for pre-release.  
- [x] Refactor `ClientHomeView` to consume the new CTA data and set `target="_blank"` on pre-release links.  
- [x] Ensure `HomeTemplate` and `<PricingCta>` use the resolved CTA props without custom logic.  
- [x] Align `StickyProductCTA` (and any nav CTA) with the resolved destination.  
- [x] Adjust analytics tracking to label waitlist clicks appropriately.  
- [x] Add unit tests covering CTA mode switching and, if practical, integration coverage.  
- [x] Run `pnpm lint`, `pnpm run typecheck`, and `pnpm test` prior to submission.
