import type { ResolvedHomeCta, HomeCtaMode } from "@/components/product/landers/default/home-template.types";
import { ROUTES } from "@/lib/routes";
import type { ProductData } from "./product-schema";

type MinimalHomeCtaProps = {
  cta?: ResolvedHomeCta | null;
  ctaMode?: HomeCtaMode | null;
  ctaHref?: string | null;
  ctaText?: string | null;
  ctaTarget?: "_self" | "_blank" | null;
  ctaRel?: string | null;
  ctaOpensInNewTab?: boolean | null;
};

export function ensureResolvedHomeCta(product: ProductData, props: MinimalHomeCtaProps): ResolvedHomeCta {
  const existingCta = props.cta ?? undefined;
  if (existingCta) {
    return {
      ...existingCta,
      analytics:
        existingCta.analytics
        ?? {
          destination: existingCta.mode === "pre_release" ? "waitlist" : "external",
        },
    };
  }

  const fallbackMode: HomeCtaMode = props.ctaMode ?? "external";

  if (fallbackMode === "pre_release" || product.status === "pre_release") {
    const defaultHref = "#waitlist";
    const waitlistHref =
      typeof product.waitlist_url === "string" && product.waitlist_url.trim().length > 0
        ? product.waitlist_url.trim()
        : defaultHref;
    return {
      mode: "pre_release",
      href: props.ctaHref ?? waitlistHref,
      text: props.ctaText ?? "Join Waitlist",
      target: "_self",
      rel: props.ctaRel ?? undefined,
      opensInNewTab: false,
      analytics: {
        destination: "waitlist",
      },
    };
  }

  const fallbackOpensInNewTab =
    props.ctaOpensInNewTab ?? (props.ctaTarget ? props.ctaTarget === "_blank" : false);

  return {
    mode: fallbackMode,
    href: props.ctaHref ?? ROUTES.checkout(product.slug),
    text: props.ctaText ?? "Get It Now",
    target: props.ctaTarget ?? (fallbackOpensInNewTab ? "_blank" : "_self"),
    rel: props.ctaRel ?? undefined,
    opensInNewTab: Boolean(fallbackOpensInNewTab),
    analytics: {
      destination: "external",
    },
  };
}
