import type { PrimaryNavbarProps, PrimaryNavLink, PrimaryNavProductLink } from "@/components/navigation/PrimaryNavbar";
import { getAllProducts } from "@/lib/products/product";
import type { ProductData } from "@/lib/products/product-schema";
import { getSiteConfig } from "@/lib/site-config";
import type { SiteConfig } from "@/lib/site-config";
import { ROUTES } from "@/lib/routes";

const NAV_LINKS: PrimaryNavLink[] = [
  { label: "Videos", href: ROUTES.videos },
  { label: "Guides", href: ROUTES.blog },
  {
    label: "Support",
    children: [
      { label: "Help Center", href: "https://help.serp.co/", external: true },
      { label: "Terms of Service", href: "https://github.com/serpapps/legal/blob/main/terms-conditions.md", external: true },
      { label: "Refund Policy", href: "https://github.com/serpapps/legal/blob/main/refund-policy.md", external: true },
      { label: "DMCA Policy", href: "https://github.com/serpapps/legal/blob/main/dmca.md", external: true },
    ],
  },
  { label: "Github", href: "https://github.com/serpapps", external: true },
  { label: "Account", href: ROUTES.account },
];

interface BuildNavOptions {
  products?: ProductData[];
  siteConfig?: SiteConfig;
}

export function buildPrimaryNavProps(options: BuildNavOptions = {}): PrimaryNavbarProps {
  const siteConfig = options.siteConfig ?? getSiteConfig();
  const productSource = options.products ?? getAllProducts();

  const productLinks: PrimaryNavProductLink[] = productSource
    .map((product) => ({ slug: product.slug, name: product.name }))
    .filter((item): item is PrimaryNavProductLink => Boolean(item.slug && item.name));

  const siteName = siteConfig.site?.name ?? "SERP Apps";
  const logoSrc = siteConfig.site?.logo ?? "/logo.svg";

  return {
    siteName,
    navLinks: NAV_LINKS,
    productLinks,
    logoSrc,
  };
}

export type PrimaryNavProps = PrimaryNavbarProps;
export { NAV_LINKS as PRIMARY_NAV_LINKS };
