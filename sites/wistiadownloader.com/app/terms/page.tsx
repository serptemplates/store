import NextLink from "next/link";
import { SiteNavbar } from "@repo/ui/composites/SiteNavbar";
import { Footer } from "@/components/Footer";
import { siteConfig } from "@/site.config";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: `Terms of Service | ${siteConfig.name}`,
  description: `Terms of Service for ${siteConfig.name} - Understand your rights and responsibilities when using our service.`,
};

export default function TermsPage() {
  return (
    <>
      <SiteNavbar site={{ name: siteConfig.name, categories: siteConfig.categories, buyUrl: siteConfig.buyUrl }} Link={NextLink} ctaText="Get It Now" />
      <main className="min-h-screen bg-background">
        <div className="container max-w-4xl py-12 md:py-20">
          <h1 className="mb-8 text-4xl font-bold">Terms of Service</h1>
          
          <div className="prose prose-gray max-w-none dark:prose-invert">
            <p className="text-lg text-muted-foreground">
              Last updated: January 8, 2025
            </p>

            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using {siteConfig.name} (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              {siteConfig.name} provides tools to download publicly available videos from Vimeo. The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind.
            </p>

            <h2>3. Use of Service</h2>
            <h3>You agree to:</h3>
            <ul>
              <li>Use the Service only for lawful purposes</li>
              <li>Respect copyright and intellectual property rights</li>
              <li>Not download videos you don&apos;t have permission to access</li>
              <li>Not use the Service to violate Vimeo&apos;s Terms of Service</li>
              <li>Not attempt to circumvent any security measures</li>
              <li>Not use automated scripts or bots without permission</li>
            </ul>

            <h2>4. Intellectual Property Rights</h2>
            <p>
              You acknowledge that all content accessed through our Service may be protected by copyright and other intellectual property rights. You are solely responsible for ensuring you have the right to download and use any content.
            </p>

            <h2>5. User Responsibilities</h2>
            <p>You are responsible for:</p>
            <ul>
              <li>Obtaining necessary permissions before downloading content</li>
              <li>Complying with all applicable laws and regulations</li>
              <li>Respecting content creators&apos; rights</li>
              <li>Using downloaded content only for permitted purposes</li>
            </ul>

            <h2>6. Prohibited Uses</h2>
            <p>You may not use the Service to:</p>
            <ul>
              <li>Download copyrighted content without permission</li>
              <li>Distribute or sell downloaded content</li>
              <li>Violate any laws or regulations</li>
              <li>Harm or exploit minors</li>
              <li>Transmit malware or harmful code</li>
              <li>Interfere with the Service&apos;s operation</li>
              <li>Attempt to gain unauthorized access</li>
            </ul>

            <h2>7. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
            </p>

            <h2>8. Limitation of Liability</h2>
            <p>
              IN NO EVENT SHALL {siteConfig.name.toUpperCase()}, ITS OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
            </p>

            <h2>9. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless {siteConfig.name} from any claims, losses, damages, liabilities, and expenses arising from your use of the Service or violation of these Terms.
            </p>

            <h2>10. Privacy</h2>
            <p>
              Your use of the Service is also governed by our Privacy Policy. Please review our Privacy Policy to understand our practices.
            </p>

            <h2>11. Modifications to Service</h2>
            <p>
              We reserve the right to modify, suspend, or discontinue the Service at any time without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuance.
            </p>

            <h2>12. Termination</h2>
            <p>
              We may terminate or suspend your access to the Service immediately, without prior notice, for any reason, including breach of these Terms.
            </p>

            <h2>13. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to conflict of law principles.
            </p>

            <h2>14. Changes to Terms</h2>
            <p>
              We reserve the right to update these Terms at any time. We will notify you of any changes by posting the new Terms on this page and updating the &quot;Last updated&quot; date.
            </p>

            <h2>15. Contact Information</h2>
            <p>
              For questions about these Terms of Service, please contact us at:
            </p>
            <ul>
              <li>Email: {siteConfig.author.email}</li>
              <li>Website: {siteConfig.url}/contact</li>
            </ul>
          </div>
        </div>
        
        <Footer />
      </main>
    </>
  );
}
