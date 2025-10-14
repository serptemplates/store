# Component Organization

The store app now leans on a clear separation between the design system packages, app-specific wiring, and the new checkout submodules. Use this document as the sourcing guide when you add or relocate UI code.

## Layers at a glance

- **`packages/ui`** – Pure, styled primitives (buttons, badges, inputs). They accept data-only props and must not import app state or browser-only APIs. Anything that could ship as a standalone npm package belongs here.
- **`packages/templates`** – Marketing or product sections that compose primitives into opinionated layouts (hero blocks, pricing, FAQ). They are still UI-only but can include copy, iconography, and layout glue.
- **`apps/store/components`** – Store-specific wiring that touches routing, data fetching, analytics, or checkout orchestration. Recent examples include the modular checkout view under `components/checkout/page/` and PayPal / Stripe entry points.
- **`apps/store/app`** – Next.js routes that stitch the UI with server actions and fetchers. Route-level components should stay lean by delegating most markup to `components/`.
- **`apps/store/lib`** – Domain logic split by capability (`checkout/`, `payments/`, `license-service/`, `ghl-client/`, etc.). UI components should only import the facades exposed by these folders (e.g., `@/lib/checkout`), never the private helpers.

## Checkout page conventions

The checkout refactor introduced a pattern worth following elsewhere:

- **Controller hook** (`components/checkout/page/useCheckoutPage.ts`) encapsulates all React Hook Form wiring, coupon application, and redirect flows.
- **Section components** (`CheckoutHeader`, `CustomerInformationSection`, `OrderSummarySection`, `PaymentMethodSection`, `CheckoutActions`) stay presentational and only accept typed props.
- **Shared types** live in `components/checkout/page/types.ts` so the section props mirror the controller state.

When you break down new screens, mirror this structure—write a hook that prepares the state, pass data into presentational sections, and keep business logic in `@/lib/**` modules.

## Promotion checklist

When a component currently in `apps/store/components` proves reusable for other apps:

1. Move the JSX into `packages/templates` or `packages/ui` depending on how low-level it is.
2. Export it from the relevant package `index.ts`.
3. Replace the store import path with the package import, and delete the original component.
4. Update or add stories/tests in the package to keep coverage local to the component.

## Guardrails

- Avoid adding new top-level folders under `apps/store/components` unless the scope is broad (e.g., `checkout/`, `account/`). Small domains should live under the nearest existing folder.
- UI code should never import private helpers from `apps/store/lib/**/internal`. Always use the public facades so refactors stay localized.
- Use the Playwright smoke suite (`pnpm test:smoke`) after significant UI moves; it covers the product lander, checkout redirect, and account surfaces.
