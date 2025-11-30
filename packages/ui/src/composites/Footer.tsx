import type { LucideIcon } from "lucide-react";
import { Github, Instagram, Twitter, Youtube } from "lucide-react";

export type FooterSite = {
  name?: string;
  url?: string;
};

export type FooterLink = { label: string; href: string; external?: boolean };

export type FooterProps = {
  legalLinks?: FooterLink[];
  site?: FooterSite;
};

const DEFAULT_LEGAL_LINKS: FooterLink[] = [
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
    href: "https://github.com/serpapps/legal/blob/main/dmca.md",
    external: true,
  },
  {
    label: "Privacy",
    href: "https://github.com/serpapps/legal/blob/main/privacy-policy.md",
  },
];

type SocialLink = {
  label: string;
  href: string;
  icon: LucideIcon;
  className?: string;
};

const SOCIAL_LINKS: SocialLink[] = [
  { label: "GitHub", href: "https://github.com/serpapps", icon: Github },
  { label: "Twitter", href: "https://twitter.com/serpapps", icon: Twitter },
  { label: "Instagram", href: "https://www.instagram.com/serpapps/", icon: Instagram },
  { label: "YouTube", href: "https://www.youtube.com/@serpapps", icon: Youtube },
];

function chunkLinks(links: FooterLink[], columns: number) {
  if (!links.length) return [];
  const columnCount = Math.min(columns, links.length);
  const itemsPerColumn = Math.ceil(links.length / columnCount);
  return Array.from({ length: columnCount }, (_, index) =>
    links.slice(index * itemsPerColumn, index * itemsPerColumn + itemsPerColumn),
  ).filter((column) => column.length > 0);
}

export function Footer({
  legalLinks = DEFAULT_LEGAL_LINKS,
  site,
}: FooterProps) {
  const linkItems = legalLinks ?? DEFAULT_LEGAL_LINKS;
  const brandName = site?.name ?? "SERP Apps";
  const brandUrl = site?.url ?? "https://serp.co";
  const groupedLinks = chunkLinks(linkItems, 4);
  // const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="flex flex-col items-start gap-4 text-left lg:col-span-2">
            <a href={brandUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-foreground text-background">
                {brandName.slice(0, 1)}
              </div>
              <span className="text-xl font-semibold text-foreground">{brandName}</span>
            </a>
            <p className="text-sm text-muted-foreground">
              Privacy-friendly automation suites for downloading, auditing, and scaling creative operations. Built with obsessive QA and brutal
              honesty about platform limitations.
            </p>
            <div className="flex items-center gap-4">
              {SOCIAL_LINKS.map(({ href, label, icon: Icon, className }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground transition hover:text-primary"
                  aria-label={label}
                >
                  <Icon className={`size-5 ${className ?? ""}`} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {groupedLinks.length ? (
            <div className="lg:col-span-3">
              <nav aria-label="Site links">
                <div className="hidden gap-6 text-sm text-muted-foreground sm:grid sm:grid-cols-2 lg:grid-cols-4">
                  {groupedLinks.map((column, index) => (
                    <div key={`column-${index}`} className="space-y-3">
                      {column.map((link) => (
                        <a
                          key={link.href}
                          className="block font-medium text-foreground/90 transition hover:text-primary"
                          href={link.href}
                          target={link.external ? "_blank" : undefined}
                          rel={link.external ? "noopener noreferrer" : undefined}
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                  ))}
                </div>

                <details className="rounded-xl border border-border/80 bg-background/70 p-4 sm:hidden">
                  <summary className="cursor-pointer list-none font-semibold tracking-tight text-foreground">
                    Browse links
                  </summary>
                  <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                    {linkItems.map((link) => (
                      <li key={link.href}>
                        <a
                          className="block rounded-md px-2 py-1 font-medium text-foreground/90 transition hover:bg-muted hover:text-primary"
                          href={link.href}
                          target={link.external ? "_blank" : undefined}
                          rel={link.external ? "noopener noreferrer" : undefined}
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              </nav>
            </div>
          ) : null}
        </div>

        <div className="mt-12 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:text-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p>
              © {brandName}. Crafted in California, deployed globally.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-foreground/80">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/80 px-3 py-1 text-xs font-medium">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4 text-green-600"
                  aria-hidden="true"
                >
                  <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                Secure checkout
              </span>
              <span className="text-xs">Visa • MasterCard • PayPal • Lemon Squeezy</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
