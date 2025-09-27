import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getSiteConfig } from "@/lib/site-config";
import { DelayedGTM } from "@/components/DelayedGTM";

const inter = Inter({ subsets: ["latin"], display: "swap" });

const STORE_TITLE = "SERP Apps";
const STORE_DESCRIPTION =
  "Browse the full SERP Apps catalog of downloaders, automations, and growth tools.";

export const metadata: Metadata = {
  title: STORE_TITLE,
  description: STORE_DESCRIPTION,
  metadataBase: new URL("https://serp.app"),
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
  },
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
