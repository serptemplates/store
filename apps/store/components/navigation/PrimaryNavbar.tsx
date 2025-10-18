"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NextLink from "next/link";
import type { Route } from "next";
import Image from "next/image";
import { ChevronDown, Menu, X } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

export interface PrimaryNavLink {
  label: string;
  href?: string;
  external?: boolean;
  children?: Array<{ label: string; href: string; external?: boolean }>;
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
  const toProductHref = useCallback((slug: string) => `/${slug}` as Route, []);
  const ctaIsExternal = ctaHref ? /^https?:/i.test(ctaHref) : false;

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const closeTimer = useRef<NodeJS.Timeout | null>(null);
  const hasProductLinks = productLinks.length > 0;
  const mobileNavId = "primary-navbar-mobile";
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

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((previous) => !previous);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobileMenu();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen, closeMobileMenu]);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const handleOpenDropdown = useCallback((label: string) => {
    clearCloseTimer();
    setOpenDropdown(label);
  }, [clearCloseTimer]);

  const handleCloseDropdown = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => {
      setOpenDropdown(null);
      closeTimer.current = null;
    }, 150);
  }, [clearCloseTimer]);

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
              width={60}
              height={60}
              priority
            />
          ) : (
            brandLabel
          )}
        </NextLink>
        <div className="hidden items-center gap-6 text-sm text-muted-foreground lg:flex">
          {hasProductLinks && (
            <div
              className="relative"
              onMouseEnter={() => handleOpenDropdown("__apps__")}
              onMouseLeave={handleCloseDropdown}
              onFocus={() => handleOpenDropdown("__apps__")}
              onBlur={(event) => {
                const nextTarget = event.relatedTarget as Node | null;
                if (!nextTarget) {
                  return;
                }
                if (!event.currentTarget.contains(nextTarget)) {
                  handleCloseDropdown();
                }
              }}
            >
              <button
                className="flex items-center gap-1 font-medium transition-colors hover:text-foreground focus:text-foreground focus:outline-none"
                type="button"
                aria-expanded={openDropdown === "__apps__"}
              >
                Apps
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    openDropdown === "__apps__" ? "rotate-180" : undefined
                  )}
                />
              </button>
              <div
                className={cn(
                  "absolute right-0 top-full z-50 pt-3 transition",
                  openDropdown === "__apps__"
                    ? "pointer-events-auto opacity-100"
                    : "pointer-events-none opacity-0"
                )}
                onMouseEnter={clearCloseTimer}
                onMouseLeave={handleCloseDropdown}
              >
                <div className="w-[min(90vw,60rem)] rounded-md border border-border bg-card p-6 shadow-xl">
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
            </div>
          )}

          {navLinks.map((link) => {
            if (link.children && link.children.length > 0) {
              const isOpen = openDropdown === link.label;
              return (
                <div
                  key={link.label}
                  className="relative"
                  onMouseEnter={() => handleOpenDropdown(link.label)}
                  onMouseLeave={handleCloseDropdown}
                  onFocus={() => handleOpenDropdown(link.label)}
                  onBlur={(event) => {
                    const nextTarget = event.relatedTarget as Node | null;
                    if (!nextTarget) {
                      return;
                    }
                    if (!event.currentTarget.contains(nextTarget)) {
                      handleCloseDropdown();
                    }
                  }}
                >
                  <button
                    className="flex items-center gap-1 font-medium transition-colors hover:text-foreground focus:text-foreground focus:outline-none"
                    type="button"
                    aria-expanded={isOpen}
                  >
                    {link.label}
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        isOpen ? "rotate-180" : undefined
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      "absolute right-0 top-full z-50 pt-3 transition",
                      isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
                    )}
                    onMouseEnter={clearCloseTimer}
                    onMouseLeave={handleCloseDropdown}
                  >
                    <div className="w-56 rounded-md border border-border bg-card p-3 shadow-xl">
                      <ul className="space-y-1 text-left text-sm">
                        {link.children.map((child) => (
                          <li key={child.href}>
                            <a
                              href={child.href}
                              className="flex items-center justify-between rounded-md px-3 py-2 text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {child.label}
                              <svg
                                className="h-3.5 w-3.5 text-muted-foreground"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M5 12h14M12 5l7 7-7 7"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            }

            if (link.external && link.href) {
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

            return link.href ? (
              <NextLink
                key={link.label}
                href={link.href as Route}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </NextLink>
            ) : (
              <span key={link.label} className="transition-colors hover:text-foreground">
                {link.label}
              </span>
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
                href={ctaHref as Route}
                className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                {ctaText ?? "Get Started"}
              </NextLink>
            )
          )}
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md border border-border bg-background/80 p-2 text-foreground transition hover:bg-background lg:hidden"
          aria-expanded={isMobileMenuOpen}
          aria-controls={mobileNavId}
          onClick={toggleMobileMenu}
        >
          <span className="sr-only">Toggle navigation</span>
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>
      {isMobileMenuOpen ? (
        <div
          id={mobileNavId}
          className="border-t border-border bg-background/95 text-sm text-muted-foreground lg:hidden"
        >
          <div className="container flex flex-col gap-3 py-4">
            {hasProductLinks && (
              <NextLink
                href={"/" as Route}
                className="font-medium text-foreground transition hover:text-primary"
                onClick={closeMobileMenu}
              >
                Apps
              </NextLink>
            )}
            {navLinks.map((link) => {
              if (link.children && link.children.length > 0) {
                return (
                  <details key={`mobile-${link.label}`}>
                    <summary className="cursor-pointer list-none font-medium text-foreground">
                      {link.label}
                    </summary>
                    <div className="mt-2 flex flex-col gap-2 pl-2">
                      {link.children.map((child) => (
                        <a
                          key={`mobile-${child.href}`}
                          href={child.href}
                          className="text-sm text-muted-foreground transition hover:text-foreground"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={closeMobileMenu}
                        >
                          {child.label}
                        </a>
                      ))}
                    </div>
                  </details>
                );
              }

              if (link.external && link.href) {
                return (
                  <a
                    key={`mobile-${link.label}`}
                    href={link.href}
                    className="transition-colors hover:text-foreground"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeMobileMenu}
                  >
                    {link.label}
                  </a>
                );
              }

              return link.href ? (
                <NextLink
                  key={`mobile-${link.label}`}
                  href={link.href as Route}
                  className="transition-colors hover:text-foreground"
                  onClick={closeMobileMenu}
                >
                  {link.label}
                </NextLink>
              ) : (
                <span key={`mobile-${link.label}`} className="text-muted-foreground">
                  {link.label}
                </span>
              );
            })}
            {showCta && ctaHref && (
              ctaIsExternal ? (
                <a
                  href={ctaHref}
                  className="mt-2 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMobileMenu}
                >
                  {ctaText ?? "Get Started"}
                </a>
              ) : (
                <NextLink
                  href={ctaHref as Route}
                  className="mt-2 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                  onClick={closeMobileMenu}
                >
                  {ctaText ?? "Get Started"}
                </NextLink>
              )
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}

export default PrimaryNavbar;
