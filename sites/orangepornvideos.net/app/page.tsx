"use client";

import { HomeTemplate } from "@repo/templates";
import { Footer } from "@/components/Footer";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Input } from "@repo/ui";
import { siteConfig } from "@/site.config";
import NextLink from "next/link";
import { SiteNavbar } from "@repo/ui/composites/SiteNavbar";

export default function HomePage() {
  return (
      <HomeTemplate
        ui={{
          Navbar: () => (
            <SiteNavbar site={{ name: siteConfig.name, categories: siteConfig.categories, buyUrl: siteConfig.buyUrl }} Link={NextLink} ctaText="Get It Now" />
          ),
          Footer,
          Button,
          Card,
          CardHeader,
          CardTitle,
          CardContent,
          Badge,
          Input,
        }}
        platform={siteConfig.platform}
        videoUrl={siteConfig.videoUrl}
      />
  );
}
