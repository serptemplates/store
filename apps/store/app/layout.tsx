import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { DelayedGTM } from "@/components/DelayedGTM";
import { PostHogAnalytics } from "@/components/analytics/PostHogAnalytics";
import { getSiteConfig } from "@/lib/site-config";

const STORE_TITLE = "SERP Apps";
const STORE_DESCRIPTION = "Browse the full catalog of SERP products.";

export const metadata: Metadata = {
  title: STORE_TITLE,
  description: STORE_DESCRIPTION,
  metadataBase: new URL("https://apps.serp.co"),
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
    url: "https://apps.serp.co",
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
        {/* Initialize dataLayer early for GTM tracking */}
        <Script
          id="gtm-datalayer-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];`,
          }}
        />
        {/* Preconnect to GTM for faster loading */}
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      </head>
      <body className="font-sans antialiased">
        <PostHogAnalytics>
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
        </PostHogAnalytics>
      </body>
    </html>
  );
}
