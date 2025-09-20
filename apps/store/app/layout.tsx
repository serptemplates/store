import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GoogleTagManager, GoogleTagManagerNoscript } from "@/components/GoogleTagManager";
import { getSiteConfig } from "@/lib/site-config";
import { SpeedInsights } from "@vercel/speed-insights/next"

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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { gtmId } = getSiteConfig();

  return (
    <html lang="en">
      <head>
        <GoogleTagManager gtmId={gtmId ?? ""} />
      </head>
      <body className={`${inter.className} antialiased`}>
        <GoogleTagManagerNoscript gtmId={gtmId ?? ""} />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
