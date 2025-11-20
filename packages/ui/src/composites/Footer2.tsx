import type { LucideIcon } from "lucide-react";
import { Github, Instagram, Twitter, Youtube } from "lucide-react";
import Link from "next/link";

import type { FooterLink, FooterSite } from "./Footer";

type FooterSection = {
  title: string;
  links: FooterLink[];
};

type ProductBadge = {
  label: string;
  href: string;
};

type ProductLogo = {
  label: string;
  href: string;
  src: string;
  alt?: string;
};

type SocialLink = {
  label: string;
  href: string;
  icon: LucideIcon;
  className?: string;
};

export type Footer2Props = {
  site?: FooterSite;
  heroDescription?: string;
  heroLinks?: FooterLink[];
  sections?: FooterSection[];
  socialLinks?: SocialLink[];
  productBadges?: ProductBadge[];
  productLogos?: ProductLogo[];
  bottomLegalLinks?: FooterLink[];
  legalBadgeText?: string;
  copyrightSuffix?: string;
};

const DEFAULT_HERO_LINKS: FooterLink[] = [
  { label: "Roadmap", href: "https://github.com/serpapps" },
];

const DEFAULT_SECTIONS: FooterSection[] = [
  {
    title: "Resources",
    links: [
      { label: "Videos", href: "/videos" },
      { label: "Blog", href: "/blog" },
      { label: "Categories", href: "/categories" },
    ],
  },
  {
    title: "Help & Support",
    links: [
      { label: "Help Center", href: "https://serpcompany.tawk.help/", external: true },
      { label: "Tickets", href: "https://serpcompany.tawk.help/#tickets", external: true },
      { label: "Chat Support", href: "https://tawk.to/serpcompany", external: true },
      { label: "Contact", href: "mailto:conact@serp.co" },
      { label: "Status", href: "https://status.serp.co", external: true },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/legal/terms" },
      { label: "DMCA", href: "/legal/dmca" },
      { label: "Refund Policy", href: "https://github.com/serpapps/legal/blob/main/refund-policy.md", external: true },
      { label: "Privacy", href: "https://serp.co/privacy", external: true },
    ],
  },
];

const DEFAULT_SOCIAL_LINKS: SocialLink[] = [
  { label: "GitHub", href: "https://github.com/serpapps", icon: Github },
  { label: "Instagram", href: "https://www.instagram.com/serpapps/", icon: Instagram, className: "text-sky-500" },
  { label: "Twitter", href: "https://twitter.com/serpapps", icon: Twitter, className: "text-amber-500" },
  { label: "YouTube", href: "https://www.youtube.com/@serpapps", icon: Youtube, className: "text-red-500" },
];

const DEFAULT_PRODUCT_BADGES: ProductBadge[] = [
  { label: "SERP Tools", href: "https://tools.serp.co" },
  { label: "SERP Extensions", href: "https://extensions.serp.co" },
  { label: "SERP Apps", href: "https://apps.serp.co" },
  { label: "SERP AI", href: "https://serp.ai" },
  { label: "SERP", href: "https://serp.co" },
  { label: "SERP Directories", href: "https://directories.serp.co" },
];

const DEFAULT_BOTTOM_LEGAL_LINKS: FooterLink[] = [
  { label: "Terms", href: "/legal/terms" },
  { label: "DMCA", href: "/legal/dmca" },
  { label: "Refund Policy", href: "https://github.com/serpapps/legal/blob/main/refund-policy.md", external: true },
  { label: "Privacy", href: "https://serp.co/privacy", external: true },
];

export function Footer2({
  site,
  heroDescription = "",
  heroLinks = DEFAULT_HERO_LINKS,
  sections = DEFAULT_SECTIONS,
  socialLinks = DEFAULT_SOCIAL_LINKS,
  productBadges = DEFAULT_PRODUCT_BADGES,
  productLogos = [],
  bottomLegalLinks = DEFAULT_BOTTOM_LEGAL_LINKS,
  legalBadgeText = "Legal",
  copyrightSuffix = "",
}: Footer2Props) {
  const brandName = site?.name ?? "SERP Apps";
  const brandUrl = site?.url ?? "https://serp.co";
  // const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background text-foreground">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-10 md:grid-cols-2 md:gap-8 md:px-6 md:py-20 lg:grid-cols-5">
        <div className="flex flex-col items-start gap-4 lg:col-span-2">
          <a href={brandUrl} className="flex items-center gap-3" target="_blank" rel="noreferrer">
            <div className="flex size-9 items-center justify-center rounded-full bg-foreground text-background">
              {brandName.slice(0, 1)}
            </div>
            <span className="text-lg font-semibold">{brandName}</span>
          </a>
          <p className="text-sm text-muted-foreground">{heroDescription}</p>
          <div className="flex items-center gap-4">
            {socialLinks.map(({ href, label, icon: Icon, className }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" className="transition hover:text-primary" aria-label={label}>
                <Icon className={`size-5 ${className ?? ""}`} aria-hidden="true" />
              </a>
            ))}
          </div>
          <div className="h-px w-36 bg-border" />
          <div className="flex flex-wrap gap-4 text-sm font-medium">
            {heroLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                className="text-foreground/80 transition hover:text-primary"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-4">
            <div className="text-base font-semibold">{section.title}</div>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {section.links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="transition hover:text-primary"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="h-px w-full bg-border" />

      {productBadges.length || productLogos.length ? (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-base font-semibold">BRANDS</p>
            {productBadges.length ? (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-medium">
                {productBadges.map((badge) => (
                  <a
                    key={badge.label}
                    href={badge.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-border px-3 py-1 text-foreground/80 transition hover:text-primary"
                  >
                    {badge.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
          {productLogos.length ? (
            <div className="flex flex-wrap items-center gap-5">
              {productLogos.map((logo) => (
                <a key={logo.label} href={logo.href} target="_blank" rel="noreferrer" className="text-foreground/80 transition hover:text-primary">
                  <img src={logo.src} alt={logo.alt ?? logo.label} className="h-8 max-w-full object-contain" />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="h-px w-full bg-border" />

      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-muted-foreground md:px-6">
        <p>
          © <a href={brandUrl}>{brandName}</a> {copyrightSuffix}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground">
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
            <a href="/legal" className="underline-offset-2 hover:underline">
              {legalBadgeText}
            </a>
          </span>
          {bottomLegalLinks.length ? (
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-foreground/80">
              {bottomLegalLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  className="hover:text-primary"
                >
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  );
}

export default Footer2;
