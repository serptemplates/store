export type FooterSite = {
  name?: string;
  url?: string;
};

export type FooterProps = {
  legalLinks?: Array<{ label: string; href: string; external?: boolean }>;
  site?: FooterSite;
};

const DEFAULT_LEGAL_LINKS: FooterProps["legalLinks"] = [
  { label: "Videos", href: "/videos" },
  { label: "Categories", href: "/categories" },
  {
    label: "About",
    href: "https://serp.co/about",
    external: true,
  },
  {
    label: "SERP Extensions",
    href: "https://extensions.serp.co",
    external: true,
  },
  {
    label: "SERP Tools",
    href: "https://tools.serp.co",
    external: true,
  },
  {
    label: "Terms of Service",
    href: "https://github.com/serpapps/legal/blob/main/terms-conditions.md",
    external: true,
  },
  {
    label: "Refund Policy",
    href: "https://github.com/serpapps/legal/blob/main/refund-policy.md",
    external: true,
  },
  {
    label: "DMCA",
    href: "https://serp.co/legal/dmca",
    external: true,
  },
];

export function Footer({
  legalLinks = DEFAULT_LEGAL_LINKS,
  site,
}: FooterProps) {
  const brandName = site?.name ?? "SERP";
  const brandUrl = site?.url ?? "https://serp.co";

  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-8">
        <div className="flex flex-col items-center gap-4 text-center text-sm text-muted-foreground md:flex-row md:justify-between">
          <p className="flex items-center gap-1">
            <span>©</span>
            <a
              href={brandUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              {brandName}
            </a>
          </p>
          {legalLinks?.length ? (
            <nav aria-label="Legal">
              <ul className="flex flex-wrap justify-center gap-4">
                {legalLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      className="hover:text-primary"
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener noreferrer" : undefined}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </div>
    </footer>
  );
}

export default Footer;
