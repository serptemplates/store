import NextLink from "next/link";
import { SiteNavbar } from "@repo/ui/composites/SiteNavbar";
import { Footer } from "@/components/Footer";
import { siteConfig } from "@/site.config";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: `Terms of Service | ${siteConfig.name}`,
  description: `Terms of Service for ${siteConfig.name}.`,
};

export default function TermsPage() {
  return (
    <>
      <SiteNavbar site={{ name: siteConfig.name, categories: siteConfig.categories }} Link={NextLink} brandSrc="/logo.png" />
      <main className="min-h-screen bg-background">
        <div className="container max-w-4xl py-12 md:py-20">
          <h1 className="mb-8 text-4xl font-bold">Terms of Service</h1>
          <div className="prose prose-gray max-w-none dark:prose-invert">
            <p>Update your Terms here.</p>
          </div>
        </div>
        <Footer />
      </main>
    </>
  );
}
