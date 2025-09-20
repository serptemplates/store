"use client";
import { useState, type ReactNode, type ComponentType } from "react";
import { Button } from "../button";
import { InteractiveHoverButton } from "../magic/InteractiveHoverButton";


export type SiteMeta = {
  name: string;
  categories: readonly string[];
  buyUrl?: string;
};

type LinkComponent = ComponentType<any>;

export type NavbarProps = {
  site: SiteMeta;
  blogHref?: string;
  brand?: ReactNode; // custom brand node (e.g., <Image ... />)
  Link?: LinkComponent; // optional Link component (e.g., next/link)
  ctaHref?: string; // overrides site.buyUrl
  ctaText?: string; // defaults to "Get It Now"
  onCtaClick?: () => void;
  ctaDisabled?: boolean;
};

export function Navbar({
  site,
  blogHref = "/blog",
  brand,
  Link,
  ctaHref,
  ctaText = "Get It Now",
  onCtaClick,
  ctaDisabled = false,
}: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const categories = site.categories;
  const LinkComp: LinkComponent = Link ?? ((props) => <a {...props} />);
  const resolvedCta = ctaHref ?? site.buyUrl ?? "#download";

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container">
        <div className="flex h-16 items-center justify-between">
          <LinkComp href="/" className="flex items-center space-x-2">
            {brand ?? (
              <span className="text-2xl font-bold text-primary">{site.name}</span>
            )}
          </LinkComp>

          <div className="hidden md:flex md:items-center md:gap-4">
            {/* <div className="flex items-center gap-6">
              <LinkComp
                href={blogHref}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                Blog
              </LinkComp>
              {categories.map((category) => (
                <LinkComp
                  key={category}
                  href={`#${category.toLowerCase().replace(" ", "-")}`}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  {category}
                </LinkComp>
              ))}
            </div> */}
            {onCtaClick ? (
              <InteractiveHoverButton onClick={onCtaClick} disabled={ctaDisabled}>
                {ctaText}
              </InteractiveHoverButton>
            ) : (
              resolvedCta && (
                <LinkComp href={resolvedCta} target="_blank" rel="noopener noreferrer" className="inline-block">
                  <InteractiveHoverButton disabled={ctaDisabled}>{ctaText}</InteractiveHoverButton>
                </LinkComp>
              )
            )}
          </div>

          {/* Nav actions end */}
        </div>

        {isMenuOpen && (
          <div className="border-t py-4 md:hidden">
            <div className="space-y-1">
              <LinkComp
                href={blogHref}
                className="block px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Blog
              </LinkComp>
              {categories.map((category) => (
                <LinkComp
                  key={category}
                  href={`#${category.toLowerCase().replace(" ", "-")}`}
                  className="block px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {category}
                </LinkComp>
              ))}
              {onCtaClick ? (
                <div className="px-4 pt-2">
                  <InteractiveHoverButton
                    className="w-full"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onCtaClick();
                    }}
                    disabled={ctaDisabled}
                  >
                    {ctaText}
                  </InteractiveHoverButton>
                </div>
              ) : (
                resolvedCta && (
                  <div className="px-4 pt-2">
                    <LinkComp
                      href={resolvedCta}
                      onClick={() => setIsMenuOpen(false)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <InteractiveHoverButton className="w-full" disabled={ctaDisabled}>
                        {ctaText}
                      </InteractiveHoverButton>
                    </LinkComp>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
