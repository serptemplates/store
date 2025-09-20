"use client";

import type { ComponentType } from "react";
import { Navbar as BaseNavbar, type SiteMeta } from "./Navbar";

export type SiteNavbarProps = {
  site: SiteMeta;
  Link: ComponentType<any>;
  brandSrc?: string; // path to logo in /public (defaults to "/logo.png")
  ctaText?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  ctaDisabled?: boolean;
  blogHref?: string;
  showLinks?: boolean;
  showCta?: boolean;
};

export function SiteNavbar({
  site,
  Link,
  brandSrc = "/logo.png",
  ctaText,
  ctaHref,
  onCtaClick,
  ctaDisabled,
  blogHref,
  showLinks,
  showCta,
}: SiteNavbarProps) {
  return (
    <BaseNavbar
      site={site}
      Link={Link}
      ctaText={ctaText}
      ctaHref={ctaHref}
      onCtaClick={onCtaClick}
      ctaDisabled={ctaDisabled}
      blogHref={blogHref}
      showLinks={showLinks}
      showCta={showCta}
      brand={<img src={brandSrc} width={64} height={64} alt={site.name} className="h-8 w-8 object-contain" />}
    />
  );
}

export default SiteNavbar;
