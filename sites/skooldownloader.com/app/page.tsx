"use client";

import { HomeTemplate } from "@repo/templates";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { siteConfig } from "@/site.config";
import NextLink from "next/link";
import { SiteNavbar } from "@repo/ui/composites/SiteNavbar";

export default function HomePage() {
  return (
    <HomeTemplate
      ui={{
        Navbar: () => (
          <SiteNavbar site={{ name: siteConfig.name, categories: siteConfig.categories }} Link={NextLink} brandSrc="/logo.png" />
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
      screenshots={[
        { src: "/screenshots/skool-downloader.png", alt: "Skool downloader UI 1" },
        { src: "/screenshots/skool-downloader2.png", alt: "Skool downloader UI 2" },
        { src: "/screenshots/skool-downloader3.png", alt: "Skool downloader UI 3" },
        { src: "/screenshots/skool-downloader4.png", alt: "Skool downloader UI 4" },
      ]}
    />
  );
}
