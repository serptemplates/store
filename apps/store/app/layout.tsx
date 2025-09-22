import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getSiteConfig } from "@/lib/site-config";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";

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
  const gaMeasurementId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

  return (
    <html lang="en">
      <head>
        {(gtmId || gaMeasurementId) ? (
          <>
            <script
              id="analytics-datalayer"
              dangerouslySetInnerHTML={{
                __html: "window.dataLayer = window.dataLayer || [];"
              }}
            />
            <script
              id="gtm-script"
              dangerouslySetInnerHTML={{
                __html: gtmId
                  ? `
                    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                    })(window,document,'script','dataLayer','${gtmId}');
                  `
                  : ""
              }}
            />
            {gaMeasurementId ? (
              <>
                <script
                  async
                  src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
                />
                <script
                  id="ga-init"
                  dangerouslySetInnerHTML={{
                    __html: `
                      window.dataLayer = window.dataLayer || [];
                      function gtag(){dataLayer.push(arguments);}
                      gtag('js', new Date());
                      gtag('config', '${gaMeasurementId}');
                    `,
                  }}
                />
              </>
            ) : null}
          </>
        ) : null}
      </head>
      <body className={`${inter.className} antialiased`}>
        {gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              title="gtm"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        {children}
        <AnalyticsTracker measurementId={gaMeasurementId} />
      </body>
    </html>
  );
}
