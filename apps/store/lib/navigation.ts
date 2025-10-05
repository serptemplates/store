import type { PrimaryNavbarProps, PrimaryNavLink, PrimaryNavProductLink } from "@/components/navigation/PrimaryNavbar";
import { getAllProducts } from "@/lib/product";
import type { ProductData } from "@/lib/product-schema";
import { getSiteConfig } from "@/lib/site-config";
import type { SiteConfig } from "@/lib/site-config";

const NAV_LINKS: PrimaryNavLink[] = [
  { label: "Videos", href: "/videos" },
  { label: "Articles", href: "/blog" },
  { label: "Github", href: "https://github.com/serpapps", external: true },
  { label: "Help", href: "https://serp.ly/@serp/support", external: true },
  { label: "Account", href: "/account" },
];

interface BuildNavOptions {
  products?: ProductData[];
  siteConfig?: SiteConfig;
  showCta?: boolean;
  ctaHref?: string | null;
  ctaText?: string | null;
}

export function buildPrimaryNavProps(options: BuildNavOptions = {}): PrimaryNavbarProps {
  const siteConfig = options.siteConfig ?? getSiteConfig();
  const productSource = options.products ?? getAllProducts();

  const productLinks: PrimaryNavProductLink[] = productSource
    .map((product) => ({ slug: product.slug, name: product.name }))
    .filter((item): item is PrimaryNavProductLink => Boolean(item.slug && item.name));

  const siteName = siteConfig.site?.name ?? "SERP Apps";
  const ctaHref = options.ctaHref ?? siteConfig.cta?.href ?? null;
  const ctaText = options.ctaText ?? siteConfig.cta?.text ?? "Shop Tools";
  const showCta = options.showCta ?? Boolean(ctaHref);
  const logoSrc = siteConfig.site?.logo ?? "/logo.svg";

  return {
    siteName,
    navLinks: NAV_LINKS,
    productLinks,
    ctaHref,
    ctaText,
    showCta,
    logoSrc,
  };
}

export type PrimaryNavProps = PrimaryNavbarProps;
export { NAV_LINKS as PRIMARY_NAV_LINKS };
