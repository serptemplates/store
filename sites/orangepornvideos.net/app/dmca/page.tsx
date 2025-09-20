import NextLink from "next/link";
import { SiteNavbar } from "@repo/ui/composites/SiteNavbar";
import { Footer } from "@/components/Footer";
import { siteConfig } from "@/site.config";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: `DMCA Policy | ${siteConfig.name}`,
  description: `DMCA Policy for ${siteConfig.name} - Copyright infringement notification procedures.`,
};

export default function DMCAPage() {
  return (
    <>
      <SiteNavbar site={{ name: siteConfig.name, categories: siteConfig.categories, buyUrl: siteConfig.buyUrl }} Link={NextLink} ctaText="Get It Now" />
      <main className="min-h-screen bg-background">
        <div className="container max-w-4xl py-12 md:py-20">
          <h1 className="mb-8 text-4xl font-bold">DMCA Policy</h1>
          
          <div className="prose prose-gray max-w-none dark:prose-invert">
            <p className="text-lg text-muted-foreground">
              Last updated: January 8, 2025
            </p>

            <h2>Digital Millennium Copyright Act Notice</h2>
            <p>
              {siteConfig.name} respects the intellectual property rights of others and expects users of our Service to do the same. In accordance with the Digital Millennium Copyright Act of 1998 (&quot;DMCA&quot;), we will respond expeditiously to claims of copyright infringement committed using our Service.
            </p>

            <h2>DMCA Compliance</h2>
            <p>
              If you believe that your copyrighted work has been copied in a way that constitutes copyright infringement and is accessible through our Service, please notify our copyright agent as set forth below.
            </p>

            <h2>Filing a DMCA Notice</h2>
            <p>
              To file a notification of alleged copyright infringement, you must provide a written communication that includes:
            </p>
            <ol>
              <li>
                A physical or electronic signature of a person authorized to act on behalf of the owner of an exclusive right that is allegedly infringed
              </li>
              <li>
                Identification of the copyrighted work claimed to have been infringed, or, if multiple copyrighted works are covered by a single notification, a representative list of such works
              </li>
              <li>
                Identification of the material that is claimed to be infringing or to be the subject of infringing activity and that is to be removed or access to which is to be disabled, and information reasonably sufficient to permit us to locate the material
              </li>
              <li>
                Information reasonably sufficient to permit us to contact the complaining party, such as an address, telephone number, and email address
              </li>
              <li>
                A statement that the complaining party has a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law
              </li>
              <li>
                A statement that the information in the notification is accurate, and under penalty of perjury, that the complaining party is authorized to act on behalf of the owner of an exclusive right that is allegedly infringed
              </li>
            </ol>

            <h2>Counter-Notification</h2>
            <p>
              If you believe that your content was wrongfully removed due to a mistake or misidentification, you may submit a counter-notification containing:
            </p>
            <ol>
              <li>Your physical or electronic signature</li>
              <li>Identification of the material that has been removed or to which access has been disabled</li>
              <li>A statement under penalty of perjury that you have a good faith belief that the material was removed or disabled as a result of mistake or misidentification</li>
              <li>Your name, address, telephone number, and email address</li>
              <li>A statement that you consent to the jurisdiction of the Federal District Court for the judicial district in which your address is located</li>
              <li>A statement that you will accept service of process from the person who provided the original DMCA notification</li>
            </ol>

            <h2>Designated Copyright Agent</h2>
            <p>
              Please send all DMCA notices and counter-notifications to:
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <p><strong>DMCA Agent</strong></p>
              <p>{siteConfig.name}</p>
              <p>Email: {siteConfig.author.email}</p>
              <p>Subject Line: DMCA Notice</p>
            </div>

            <h2>Repeat Infringers</h2>
            <p>
              In accordance with the DMCA and other applicable law, we have adopted a policy of terminating, in appropriate circumstances, users who are deemed to be repeat infringers. We may also, in our sole discretion, limit access to the Service and/or terminate the access of any users who infringe any intellectual property rights of others.
            </p>

            <h2>Disclaimer</h2>
            <p>
              {siteConfig.name} is a tool that allows users to download publicly available videos. We do not host any copyrighted content on our servers. Users are responsible for ensuring they have the right to download and use any content accessed through our Service.
            </p>

            <h2>Good Faith Belief</h2>
            <p>
              Any person who knowingly materially misrepresents that material or activity is infringing, or that material or activity was removed or disabled by mistake or misidentification, may be subject to liability.
            </p>

            <h2>Modifications</h2>
            <p>
              We reserve the right to modify this DMCA Policy at any time. Changes will be posted on this page with an updated revision date.
            </p>

            <h2>Contact Information</h2>
            <p>
              For any questions regarding this DMCA Policy, please contact us at:
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
