import type { PrimaryNavbarProps, PrimaryNavLink, PrimaryNavProductLink } from "@/components/navigation/PrimaryNavbar";
import { getAllProducts } from "@/lib/products/product";
import type { ProductData } from "@/lib/products/product-schema";
import { getSiteConfig } from "@/lib/site-config";
import type { SiteConfig } from "@/lib/site-config";

const NAV_LINKS: PrimaryNavLink[] = [
  { label: "Videos", href: "/videos" },
  { label: "Guides", href: "/blog" },
  { label: "Github", href: "https://github.com/serpapps", external: true },
  {
    label: "Support",
    children: [
      { label: "Help Center", href: "https://serpcompany.tawk.help/", external: true },
      { label: "Tickets", href: "https://serpcompany.tawk.help/#tickets", external: true },
      { label: "Chat Support", href: "https://tawk.to/serpcompany", external: true },
      { label: "Terms of Service", href: "/legal/terms" },
      { label: "DMCA Policy", href: "/legal/dmca" },
    ],
  },
  { label: "Account", href: "/account" },
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
