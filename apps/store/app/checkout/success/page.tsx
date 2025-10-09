import { Suspense } from "react";

import PrimaryNavbar from "@/components/navigation/PrimaryNavbar";
import { SuccessContent } from "./SuccessContent";
import { buildPrimaryNavProps } from "@/lib/navigation";
import { getSiteConfig } from "@/lib/site-config";
import { Footer as FooterComposite } from "@repo/ui/composites/Footer";

function SuccessFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-muted/10">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">Loading your order details...</p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  const siteConfig = getSiteConfig();
  const navProps = buildPrimaryNavProps({ siteConfig, showCta: false });
  const footerSiteName = siteConfig.site?.name ?? "SERP";
  const footerSiteUrl =
    siteConfig.site?.domain ? `https://${siteConfig.site.domain}` : "https://serp.co";

  return (
    <>
      <PrimaryNavbar {...navProps} />
      <Suspense fallback={<SuccessFallback />}>
        <SuccessContent />
      </Suspense>
      <FooterComposite site={{ name: footerSiteName, url: footerSiteUrl }} />
    </>
  );
}
