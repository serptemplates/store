# Update The Store Footer

This SOP explains how to ship a footer change without missing any of the places where the component is consumed. Follow the steps in order.

## 1. Review the existing footer variants

1. Open `packages/ui/src/composites/Footer.tsx` (primary footer) and `packages/ui/src/composites/Footer2.tsx` (alternate layout).
2. Confirm which variant(s) are used by the pages you plan to touch. Most product/marketing pages import `Footer` directly, while experiments can opt into `Footer2`.
3. Decide whether your change belongs in the shared component (preferred) or in a variant-specific prop/default.

## 2. Implement the design change in the component

1. Update the relevant footer file in `packages/ui/src/composites/`.
   - Keep props flexible; expose new content through props/default objects so callers don’t have to duplicate markup.
   - If you add new icons, update the `lucide-react` imports at the top of the file.
2. Run `pnpm lint` at the repo root to catch any TypeScript or formatting issues early.

## 3. Ensure every page renders the shared footer

1. Search for `FooterComposite` imports under `apps/store/app/**`.
2. For any page that still inlines custom markup, replace it with the shared footer component so future updates stay DRY.
3. If you need site-wide footer changes (e.g., new links on every page), update the shared component only. Do **not** edit page-level copies—escalate by converting that page to use the shared component first.

## 4. Update global layout if necessary

1. If the footer should appear on *every* page automatically, add it to `apps/store/app/layout.tsx` after `{children}` instead of declaring it page-by-page.
2. Remove duplicated per-page footers once the layout renders it globally.

## 5. Document new props or data dependencies

1. If you added new props (e.g., `productLogos`, `paymentProviders`), update the exported types within the footer file.
2. Note the new behavior in this SOP or in component-level JSDoc so future contributors know how to configure it.

## 6. Validate before handing off

1. Run the required commands from `AGENTS.md`: `pnpm lint`, `pnpm typecheck`, and `pnpm test:unit`.
2. Spot-check at least one page in the browser (Playwright MCP or Chrome DevTools MCP) to confirm the new footer renders as expected on desktop and mobile breakpoints.
3. If QA reveals per-page overrides, refactor them to consume the shared component before shipping.

Following this checklist keeps footer changes centralized and prevents “WET” duplications across page files.
