export type FooterSite = {
  name?: string;
};

export type FooterProps = {
  legalLinks?: Array<{ label: string; href: string; external?: boolean }>;
  site?: FooterSite;
};

const DEFAULT_LEGAL_LINKS: FooterProps["legalLinks"] = [
  { label: "Videos", href: "/videos" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "DMCA", href: "/dmca" },
  { label: "Contact", href: "/contact" },
];

export function Footer({
  legalLinks = DEFAULT_LEGAL_LINKS,
  site,
}: FooterProps) {
  const brandName = site?.name ?? "SERP";

  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-8">
        <div className="flex flex-col items-center gap-4 text-center text-sm text-muted-foreground md:flex-row md:justify-between">
          <p>
            ©
            <a href="https://serp.co" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
              {brandName}
            </a>
            . 
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
