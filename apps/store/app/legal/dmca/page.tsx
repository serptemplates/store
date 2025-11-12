import type { Metadata } from "next";

import PrimaryNavbar from "@/components/navigation/PrimaryNavbar";
import { ProductBreadcrumb } from "@/components/product/ProductBreadcrumb";
import { buildPrimaryNavProps } from "@/lib/navigation";
import { getAllProducts } from "@/lib/products/product";
import { getSiteConfig } from "@/lib/site-config";
import { getSiteBaseUrl } from "@/lib/urls";

const LAST_UPDATED_LABEL = "November 2025";

export async function generateMetadata(): Promise<Metadata> {
  const siteConfig = getSiteConfig();
  const baseUrl = getSiteBaseUrl();
  const siteName = siteConfig.site?.name ?? "SERP Apps";

  return {
    title: `${siteName} DMCA Policy`,
    description:
      "Learn how to submit DMCA takedown notices or counter-notifications, contact our designated agent, and understand our repeat-infringer policy.",
    alternates: {
      canonical: `${baseUrl}/legal/dmca`,
    },
    openGraph: {
      type: "article",
      title: `${siteName} DMCA Policy`,
      description:
        "Read the SERP Apps DMCA procedure, designated agent contact details, and counter-notification process.",
      url: `${baseUrl}/legal/dmca`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${siteName} DMCA Policy`,
      description: "DMCA takedown and counter-notification guidelines for SERP Apps.",
    },
  };
}

export default function DmcaPolicyPage() {
  const siteConfig = getSiteConfig();
  const products = getAllProducts();
  const siteName = siteConfig.site?.name ?? "SERP Apps";
  const navProps = buildPrimaryNavProps({ products, siteConfig });

  return (
    <>
      <PrimaryNavbar {...navProps} />
      <main className="bg-background text-foreground">
        <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <ProductBreadcrumb
            className="text-xs text-muted-foreground"
            items={[
              { label: "Home", href: "/" },
              { label: "Legal", href: "/legal" },
              { label: "DMCA Policy" },
            ]}
          />
          <article className="prose prose-slate dark:prose-invert mt-6 space-y-6">
            <header>
              <h1>DMCA Policy &amp; Designated Agent</h1>
              <p>
                <em>Last updated: {LAST_UPDATED_LABEL}</em>
              </p>
              <p>
                We respect the intellectual property rights of others and expect users of our Services to do the same. This page explains how to
                submit DMCA takedown notices or counter-notifications, how to contact our Designated Agent, and the repeat-infringer policies we
                implement in accordance with 17 U.S.C. § 512.
              </p>
            </header>

            <section>
              <h2>1. Submitting a DMCA Takedown Notice</h2>
              <p>
                If you believe that material available through our Services infringes your copyright, please submit a written notice to our
                Designated Agent that includes the following information (as required by 17 U.S.C. § 512(c)(3)):
              </p>
              <ol className="list-decimal space-y-2 pl-6">
                <li>A physical or electronic signature of the person authorized to act on behalf of the copyright owner.</li>
                <li>Identification of the copyrighted work claimed to have been infringed, or a representative list if multiple works are involved.</li>
                <li>Identification of the material that is claimed to be infringing and information reasonably sufficient to allow us to locate it (such as specific URL(s)).</li>
                <li>Your contact information, including name, mailing address, telephone number, and email address.</li>
                <li>A statement that you have a good-faith belief that the use of the material complained of is not authorized by the copyright owner, its agent, or the law.</li>
                <li>A statement that the information in the notice is accurate and, under penalty of perjury, that you are authorized to act on behalf of the copyright owner.</li>
              </ol>
            </section>

            <section>
              <h2>2. Designated Agent Contact Information</h2>
              <p>Please direct all DMCA notices and counter-notifications to our Designated Agent:</p>
              <p>
                <strong>Name/Title:</strong> SoCal IP Law Group LLP
                <br />
                <strong>Address:</strong> 310 N. Westlake Blvd., Suite 120 Westlake Village, CA 91362
                <br />
                <strong>Email:</strong> <a href="mailto:dmca@serp.co">dmca@serp.co</a>
              </p>
              <p>
                Upon receipt of a valid DMCA notice, we will investigate and take appropriate action, which may include removing or disabling
                access to the allegedly infringing material.
              </p>
            </section>

            <section>
              <h2>3. Counter-Notification Procedure</h2>
              <p>
                If you believe that material was removed or disabled as a result of mistake or misidentification, you may send a counter-notification
                to our Designated Agent. Your counter-notice must include:
              </p>
              <ol className="list-decimal space-y-2 pl-6">
                <li>Your physical or electronic signature.</li>
                <li>Identification of the material that has been removed or to which access has been disabled, and the location where the material appeared before it was removed or disabled.</li>
                <li>A statement, under penalty of perjury, that you have a good-faith belief that the material was removed or disabled as a result of mistake or misidentification.</li>
                <li>Your name, address, and telephone number, and a statement that you consent to the jurisdiction of the federal district court for your address (or, if outside the United States, the federal courts located in San Francisco, California), and that you will accept service of process from the person who provided the original DMCA notice or their agent.</li>
              </ol>
              <p>
                If we receive a valid counter-notice, we may restore the material within 10–14 business days unless the complaining party notifies us
                that they have filed an action seeking a court order to restrain the allegedly infringing activity.
              </p>
            </section>

            <section>
              <h2>4. Repeat-Infringer Policy</h2>
              <p>
                In appropriate circumstances, we will disable or terminate the accounts of users who are repeat infringers, consistent with 17
                U.S.C. § 512(i).
              </p>
            </section>

            <section>
              <h2>5. Designated Agent Registration</h2>
              <p>
                SERP Apps has designated a DMCA Agent with the U.S. Copyright Office. You can verify our registration in the public {" "}
                <a
                  href="https://dmca.copyright.gov/osp/"
                  target="_blank"
                  rel="noreferrer"
                >
                  DMCA Designated Agent Directory
                </a>
                . If registration is pending, we will complete the designation before publishing this page.
              </p>
            </section>

            <section>
              <h2>6. Disclaimer</h2>
              <p>
                This information is provided to comply with the DMCA and should not be construed as legal advice. If you are uncertain about your
                rights or obligations under the DMCA or other laws, you should consult an attorney.
              </p>
            </section>
          </article>
        </div>
      </main>
    </>
  );
}
