"use client";

import { useCallback, useMemo } from "react";
import NextLink from "next/link";
import Image from "next/image";

export interface PrimaryNavLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface PrimaryNavProductLink {
  name: string;
  slug: string;
}

export interface PrimaryNavbarProps {
  siteName: string;
  navLinks: PrimaryNavLink[];
  productLinks: PrimaryNavProductLink[];
  ctaHref?: string | null;
  ctaText?: string | null;
  showCta?: boolean;
  logoSrc?: string | null;
}

export function PrimaryNavbar({
  siteName,
  navLinks,
  productLinks,
  ctaHref,
  ctaText,
  showCta = false,
  logoSrc,
}: PrimaryNavbarProps) {
  const toProductHref = useCallback(
    (slug: string) => ({ pathname: `/${slug}` } as any),
    [],
  );
  const ctaIsExternal = ctaHref ? /^https?:/i.test(ctaHref) : false;

  const productColumns = useMemo(() => {
    const columnCount = 4;
    if (!productLinks.length) {
      return [] as PrimaryNavProductLink[][];
    }

    const sorted = [...productLinks].sort((a, b) => a.name.localeCompare(b.name));
    const itemsPerColumn = Math.ceil(sorted.length / columnCount) || 1;

    return Array.from({ length: columnCount }, (_, index) =>
      sorted.slice(index * itemsPerColumn, (index + 1) * itemsPerColumn),
    ).filter((column) => column.length > 0);
  }, [productLinks]);

  const brandLabel = useMemo(() => {
    if (!siteName) {
      return "SERP";
    }

    if (siteName.length <= 12) {
      return siteName;
    }

    const words = siteName.split(/\s+/).filter(Boolean);
    if (words.length === 1) {
      return siteName.slice(0, 12);
    }

    const initials = words
      .map((word) => word[0]?.toUpperCase())
      .join("");

    return initials.length >= 2 ? initials : siteName.slice(0, 12);
  }, [siteName]);

  return (
    <header className="relative z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container flex h-16 items-center justify-between">
        <NextLink href="/" className="flex items-center gap-2 text-lg font-semibold">
          {logoSrc ? (
            <Image
              src={logoSrc}
              alt={siteName}
              width={140}
              height={36}
              className="h-9 w-auto"
              priority
            />
          ) : (
            brandLabel
          )}
        </NextLink>
        <div className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
          <div className="relative group">
            <button className="font-medium transition-colors hover:text-foreground" type="button">
              Apps
            </button>
            <div className="absolute right-0 top-full z-50 mt-2 hidden w-[min(90vw,60rem)] rounded-md border border-border bg-card p-6 shadow-xl group-hover:block group-focus-within:block">
              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {productColumns.map((column, columnIndex) => (
                  <div key={columnIndex} className="space-y-2">
                    {column.map((item) => (
                      <NextLink
                        key={item.slug}
                        href={toProductHref(item.slug)}
                        className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {item.name}
                      </NextLink>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {navLinks.map((link) => {
            if (link.external) {
              return (
                <a
                  key={link.label}
                  href={link.href}
                  className="transition-colors hover:text-foreground"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                </a>
              );
            }

            return (
              <NextLink
                key={link.label}
                href={{ pathname: link.href } as any}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </NextLink>
            );
          })}

          {showCta && ctaHref && (
            ctaIsExternal ? (
              <a
                href={ctaHref}
                className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                target="_blank"
                rel="noopener noreferrer"
              >
                {ctaText ?? "Get Started"}
              </a>
            ) : (
              <NextLink
                href={{ pathname: ctaHref } as any}
                className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                {ctaText ?? "Get Started"}
              </NextLink>
            )
          )}
        </div>
      </nav>
      <details className="container border-t border-border/60 py-3 text-sm text-muted-foreground sm:hidden">
        <summary className="cursor-pointer list-none font-medium text-foreground">Browse products</summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {productLinks.map((item) => (
            <NextLink key={item.slug} href={toProductHref(item.slug)} className="block">
              {item.name}
            </NextLink>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-3">
          {navLinks.map((link) => {
            if (link.external) {
              return (
                <a
                  key={`mobile-${link.label}`}
                  href={link.href}
                  className="transition-colors hover:text-foreground"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                </a>
              );
            }

            return (
              <NextLink
                key={`mobile-${link.label}`}
                href={{ pathname: link.href } as any}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </NextLink>
            );
          })}
          {showCta && ctaHref && (
            ctaIsExternal ? (
              <a
                href={ctaHref}
                className="mt-2 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                target="_blank"
                rel="noopener noreferrer"
              >
                {ctaText ?? "Get Started"}
              </a>
            ) : (
              <NextLink
                href={{ pathname: ctaHref } as any}
                className="mt-2 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                {ctaText ?? "Get Started"}
              </NextLink>
            )
          )}
        </div>
      </details>
    </header>
  );
}

export default PrimaryNavbar;
