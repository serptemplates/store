/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { HomeTemplate, type HomeTemplateProps } from "@repo/templates";
import { Footer } from "@/components/Footer";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Input } from "@repo/ui";
import NextLink from "next/link";
import { SiteNavbar } from "@repo/ui/composites/SiteNavbar";
import { siteConfig } from "@/site.config";

type Props = Omit<HomeTemplateProps, "ui">;

const Navbar = () => (
  <SiteNavbar
    site={{ name: siteConfig.name, categories: siteConfig.categories, buyUrl: siteConfig.buyUrl }}
    Link={NextLink}
    ctaText="Get It Now"
  />
);

export default function ClientHome(props: Props) {
  return (
    <HomeTemplate
      ui={{ Navbar, Footer, Button, Card, CardHeader, CardTitle, CardContent, Badge, Input }}
      {...props}
    />
  );
}

