import type { Metadata } from "next";
import "./globals.css";
import { DelayedGTM } from "@/components/DelayedGTM";
import { PostHogAnalytics } from "@/components/analytics/PostHogAnalytics";
import { DubAnalytics } from "@/components/analytics/DubAnalytics";
import { getSiteConfig } from "@/lib/site-config";
import { Providers } from "./providers";
import { inter } from "./fonts";
import Footer2 from "@repo/ui/composites/Footer2";

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
  const siteConfig = getSiteConfig();
  const { gtmId } = siteConfig;
  const rawSiteName = siteConfig.site?.name ?? "SERP Apps";
  const normalizedSiteName = rawSiteName.replace(/\bApps\b/gi, "").trim() || rawSiteName;
  const domain = siteConfig.site?.domain?.trim();
  const siteUrl = domain
    ? /^https?:\/\//i.test(domain)
      ? domain
      : `https://${domain.replace(/^\/+/, "")}`
    : "https://serp.co";

  return (
    <html lang="en">
      <head>
        {/* Resource hints for critical third-party domains */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://api.stripe.com" />
        <link rel="dns-prefetch" href="https://js.stripe.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
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
            {/* Dub Analytics for affiliate and click tracking */}
            <DubAnalytics />
            <Footer2 site={{ name: normalizedSiteName, url: siteUrl }} />
          </PostHogAnalytics>
        </Providers>
      </body>
    </html>
  );
}
