import type { Metadata } from "next";

import PrimaryNavbar from "@/components/navigation/PrimaryNavbar";
import { ProductBreadcrumb } from "@/components/product/ProductBreadcrumb";
import { buildPrimaryNavProps } from "@/lib/navigation";
import { getAllProducts } from "@/lib/products/product";
import { getSiteConfig } from "@/lib/site-config";
import { getSiteBaseUrl } from "@/lib/urls";

const LEGAL_LINKS = [
  {
    title: "Terms of Service",
    description: "Licensing terms, acceptable use, and refund policy for SERP Apps products.",
    href: "/legal/terms",
  },
  {
    title: "DMCA Policy",
    description: "How to submit takedown notices, counter-notifications, and contact our agent.",
    href: "/legal/dmca",
  },
  {
    title: "Refund Policy",
    description: "One-time license purchases are final. Review our refund commitments.",
    href: "https://github.com/serpapps/legal/blob/main/refund-policy.md",
    external: true,
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = getSiteBaseUrl();
  const siteConfig = getSiteConfig();
  const siteName = siteConfig.site?.name ?? "SERP Apps";

  return {
    title: `${siteName} Legal Center`,
    description: "Central hub for Terms of Service, DMCA, and refund disclosures for SERP Apps.",
    alternates: {
      canonical: `${baseUrl}/legal`,
    },
    openGraph: {
      type: "website",
      title: `${siteName} Legal Center`,
      description: "Find SERP Apps' legal documents including Terms of Service and DMCA policy.",
      url: `${baseUrl}/legal`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${siteName} Legal Center`,
      description: "Links to SERP Apps' Terms, DMCA policy, and refund guidance.",
    },
  };
}

export default function LegalIndexPage() {
  const siteConfig = getSiteConfig();
  const products = getAllProducts();
  const siteName = siteConfig.site?.name ?? "SERP Apps";
  const navProps = buildPrimaryNavProps({ products, siteConfig });

  return (
    <>
      <PrimaryNavbar {...navProps} />
      <main className="bg-background text-foreground">
        <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <ProductBreadcrumb
            className="text-xs text-muted-foreground"
            items={[
              { label: "Home", href: "/" },
              { label: "Legal" },
            ]}
          />
          <section className="mt-6 space-y-4">
            <header className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">Legal Center</h1>
              <p className="text-sm text-muted-foreground">
                Review the official policies that govern access to {siteName} software. Each document below links to the canonical copy.
              </p>
            </header>

            <div className="grid gap-4 sm:grid-cols-2">
              {LEGAL_LINKS.map((link) => (
                <a
                  key={link.title}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  className="rounded-xl border border-border/70 bg-card/40 p-4 transition hover:border-primary/60 hover:bg-card"
                >
                  <h2 className="text-lg font-semibold text-foreground">{link.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{link.description}</p>
                  <p className="mt-3 text-xs font-medium text-primary">
                    {link.external ? "View external policy" : "Read document"}
                  </p>
                </a>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
