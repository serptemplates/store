import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import dynamic from "next/dynamic";
import { getSiteConfig } from "@/lib/site-config";

// Lazy load GTM to improve initial page load
const DelayedGTM = dynamic(() => import("@/components/DelayedGTM").then(mod => ({ default: mod.DelayedGTM })), {
  ssr: false
});

const inter = Inter({ subsets: ["latin"], display: "swap" });

const STORE_TITLE = "SERP Apps";
const STORE_DESCRIPTION =
  "Browse the full SERP Apps catalog of downloaders, automations, and growth tools.";

export const metadata: Metadata = {
  title: STORE_TITLE,
  description: STORE_DESCRIPTION,
  metadataBase: new URL("https://serp.app"),
  openGraph: {
    type: "website",
    title: STORE_TITLE,
    description: STORE_DESCRIPTION,
    url: "https://serp.app",
  },
  twitter: {
    card: "summary_large_image",
    title: STORE_TITLE,
    description: STORE_DESCRIPTION,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { gtmId } = getSiteConfig();

  return (
    <html lang="en">
      <head>
        {/* Preconnect to critical domains for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      </head>
      <body className={`${inter.className} antialiased`}>
        {gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              title="Google Tag Manager"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        {children}
        {/* Load GTM after page content to improve performance */}
        {gtmId && <DelayedGTM gtmId={gtmId} />}
      </body>
    </html>
  );
}
