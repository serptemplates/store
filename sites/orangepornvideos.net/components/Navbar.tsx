"use client";

import NextLink from "next/link";
import { SiteNavbar } from "@repo/ui/composites/SiteNavbar";
import { siteConfig } from "@/site.config";

export function Navbar() {
  return (
    <SiteNavbar site={{ name: siteConfig.name, categories: siteConfig.categories, buyUrl: siteConfig.buyUrl }} Link={NextLink} ctaText="Get It Now" />
  );
}
