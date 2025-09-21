import { getAllProducts } from "@/lib/product";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import NextLink from "next/link";
import { ProductsFilter } from "../components/ProductsFilter";

const CATEGORY_RULES: Array<{ label: string; keywords: string[] }> = [
  {
    label: "Adult Sites",
    keywords: [
      "adult",
      "porn",
      "xxx",
      "xvideos",
      "xhamster",
      "xnxx",
      "stripchat",
      "cam",
      "bonga",
      "beeg",
      "spank",
      "erome",
      "erothots",
      "tnaflix",
      "orangeporn",
      "chaturbate",
    ],
  },
  {
    label: "Course Platforms",
    keywords: [
      "course",
      "udemy",
      "skillshare",
      "teachable",
      "academy",
      "learn",
      "learning",
      "education",
      "university",
      "khan",
      "thinkific",
      "kajabi",
      "learndash",
      "moodle",
      "whop",
      "skool",
      "communities",
    ],
  },
  {
    label: "Social & Community",
    keywords: [
      "tiktok",
      "instagram",
      "facebook",
      "twitter",
      "youtube",
      "snapchat",
      "vk",
      "reddit",
      "giphy",
      "onlyfans",
    ],
  },
  {
    label: "Stock Media",
    keywords: [
      "stock",
      "vector",
      "shutter",
      "istock",
      "depositphotos",
      "adobe",
      "alamy",
      "stocksy",
      "stockvault",
      "storyblocks",
      "dreamstime",
      "123rf",
      "vectorstock",
      "unsplash",
    ],
  },
  {
    label: "Video Platforms",
    keywords: [
      "vimeo",
      "wistia",
      "loom",
      "stream",
      "dailymotion",
      "terabox",
      "vimeo",
      "vk video",
    ],
  },
  {
    label: "File Utilities",
    keywords: [
      "pdf",
      "csv",
      "file",
      "tool",
      "transcript",
      "combiner",
      "converter",
    ],
  },
];

function deriveCategories(product: any): string[] {
  const haystack = [
    product.slug,
    product.platform,
    ...(product.categories ?? []),
    ...(product.keywords ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const categories = new Set<string>();
  categories.add("Downloaders");

  CATEGORY_RULES.forEach((rule) => {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      categories.add(rule.label);
    }
  });

  return Array.from(categories);
}

const navLinks = [
  { label: "Docs", href: "https://github.com/serpapps" as const },
  { label: "Support", href: "https://github.com/serpapps/support" as const }
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
    productLinks.slice(index * itemsPerColumn, (index + 1) * itemsPerColumn)
  ).filter((column) => column.length > 0);

  const filterItems = products.map((product) => {
    const broadCategories = deriveCategories(product);
    const keywords = Array.from(
      new Set([
        product.name,
        product.platform ?? "",
        ...(product.keywords ?? []),
        ...broadCategories,
      ].filter(Boolean))
    );

    return {
      slug: product.slug,
      name: product.name,
      categories: broadCategories,
      keywords,
      platform: product.platform,
    };
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="relative z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="container flex h-16 items-center justify-between">
          <NextLink href="/" className="text-lg font-semibold">
            SERP
          </NextLink>
          <div className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            <div className="relative group">
              <button className="font-medium transition-colors hover:text-foreground">Products</button>
              <div className="absolute right-0 top-full z-50 mt-2 hidden w-[min(90vw,60rem)] rounded-md border border-border bg-card p-6 shadow-xl group-hover:block group-focus-within:block">
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
          <summary className="cursor-pointer list-none font-medium text-foreground">Browse products</summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {productLinks.map((item) => (
              <NextLink key={item.slug} href={`/${item.slug}`} className="block">
                {item.name}
              </NextLink>
            ))}
          </div>
        </details>
      </header>

      <main className="container flex flex-col gap-16 py-16">
        <section className="relative z-0 text-center space-y-6">
          <Badge className="px-3 py-1 text-sm">SERP Apps</Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">SERP Apps</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{heroDescription}</p>
        </section>

        <ProductsFilter products={filterItems} />
      </main>

      <footer className="border-t bg-muted/40">
        <div className="container flex flex-col gap-2 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} SERP Apps </p>
          <div className="flex gap-4">
            <NextLink href="/blog" target="_blank" rel="noopener noreferrer" className="underline">
              Blog
            </NextLink>
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
