/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { HomeTemplate, type HomeTemplateProps } from "@repo/templates";
import NextLink from "next/link";
import { SiteNavbar } from "@repo/ui/composites/SiteNavbar";
import { siteConfig } from "@/site.config";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type Props = Omit<HomeTemplateProps, "ui">;

const Navbar = () => (
  <SiteNavbar site={{ name: siteConfig.name, categories: siteConfig.categories }} Link={NextLink} brandSrc="/logo.png" />
);

export default function ClientHome(props: Props) {
  return (
    <HomeTemplate
      ui={{ Navbar, Footer, Button, Card, CardHeader, CardTitle, CardContent, CardDescription, Badge, Input }}
      {...props}
    />
  );
}
