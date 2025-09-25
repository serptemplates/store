import Link from "next/link";

import { getAllProducts } from "@/lib/product";
import { Badge } from "@repo/ui/badge";
import NextLink from "next/link";

const navLinks = [
  { label: "Blog", href: "/blog" as const },
  { label: "Docs", href: "https://github.com/serpapps" as const },
  { label: "Support", href: "https://github.com/serpapps/support" as const },
];

const heroDescription =
  "Browse the full SERP Apps catalog of downloaders, automations, and growth tools.";

export default function Page() {
  const products = getAllProducts();

  const productLinks = products
    .map((product) => ({ slug: product.slug, name: product.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const columnCount = 4;
  const itemsPerColumn = Math.ceil(productLinks.length / columnCount);
  const productColumns = Array.from({ length: columnCount }, (_, index) =>
    productLinks.slice(index * itemsPerColumn, (index + 1) * itemsPerColumn),
  ).filter((column) => column.length > 0);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="container flex h-16 items-center justify-between">
          <NextLink href="/" className="text-lg font-semibold">
            SERP
          </NextLink>
          <div className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            <div className="relative group">
              <button className="font-medium transition-colors hover:text-foreground">Products</button>
              <div className="absolute right-0 top-full z-20 mt-2 hidden w-[min(90vw,60rem)] rounded-md border border-border bg-popover p-6 shadow-lg group-hover:block group-focus-within:block">
                <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {productColumns.map((column, columnIndex) => (
                    <div key={columnIndex} className="space-y-2">
                      {column.map((item) => (
                        <NextLink
                          key={item.slug}
                          href={`/${item.slug}`}
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

            {navLinks.map((link) => (
              <NextLink
                key={link.label}
                href={link.href}
                className="transition-colors hover:text-foreground"
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
              >
                {link.label}
              </NextLink>
            ))}
          </div>
        </nav>
        <details className="container border-t border-border/60 py-3 text-sm text-muted-foreground sm:hidden">
          <summary className="cursor-pointer list-none font-medium text-foreground">Browse</summary>
          <div className="mt-3 space-y-3">
            <div className="grid gap-2">
              {navLinks.map((link) => (
                <NextLink key={link.label} href={link.href} className="block">
                  {link.label}
                </NextLink>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {productLinks.map((item) => (
                <NextLink key={item.slug} href={`/${item.slug}`} className="block">
                  {item.name}
                </NextLink>
              ))}
            </div>
          </div>
        </details>
      </header>

      <main className="container flex flex-col gap-16 py-16">
        <section className="text-center space-y-6">
          <Badge className="px-3 py-1 text-sm">SERP Apps</Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">SERP Apps</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{heroDescription}</p>
        </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => {
          const categories = Array.isArray(product.categories) ? product.categories : [];

          const preferredCategory =
            categories.find((category) => category.toLowerCase() === "downloader") ||
            categories.find((category) => /[A-Z]/.test(category)) ||
            categories[0];

          const categoryLabel = preferredCategory
            ? /[A-Z]/.test(preferredCategory)
              ? preferredCategory
              : preferredCategory.replace(/\b\w/g, (char) => char.toUpperCase())
            : product.platform;

          return (
            <Link
              key={product.slug}
              href={`/${product.slug}`}
              className="group flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm ring-1 ring-border/60 transition duration-200 hover:-translate-y-1 hover:border-border hover:shadow-lg hover:ring-border"
            >
              {categoryLabel && (
                <span className="w-fit rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition group-hover:bg-primary/10 group-hover:text-foreground">
                  {categoryLabel}
                </span>
              )}
              <h3 className="text-sm font-semibold text-foreground">{product.name}</h3>
              <span className="mt-auto text-sm font-medium text-primary transition group-hover:underline">
                View →
              </span>
            </Link>
          );
        })}
      </section>
      </main>

      <footer className="border-t bg-muted/40">
        <div className="container flex flex-col gap-2 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} SERP Apps. </p>
          <div className="flex gap-4">
            <NextLink href="https://github.com/serpapps/legal/blob/main/terms-conditions.md" target="_blank" rel="noopener noreferrer" className="underline">
              Terms & Conditions
            </NextLink>
            <NextLink href="https://github.com/serpapps/legal/blob/main/refund-policy.md" target="_blank" rel="noopener noreferrer" className="underline">
              Refund Policy
            </NextLink>
          </div>
        </div>
      </footer>
    </div>
  );
}
