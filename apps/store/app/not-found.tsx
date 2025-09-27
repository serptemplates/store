import { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Page Not Found - Redirecting",
  robots: "noindex, nofollow",
};

export default function NotFound() {
  // Use meta refresh as a fallback and JavaScript redirect for immediate redirect
  return (
    <>
      {/* Meta refresh fallback - redirects after 0 seconds */}
      <meta httpEquiv="refresh" content="0; url=/" />

      {/* JavaScript redirect for immediate effect */}
      <Script
        id="redirect-404"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.location.replace('/');
          `,
        }}
      />

      {/* Show a brief loading state while redirecting */}
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Page not found</h1>
          <p className="mt-2 text-muted-foreground">Redirecting to homepage...</p>
        </div>
      </div>
    </>
  );
}