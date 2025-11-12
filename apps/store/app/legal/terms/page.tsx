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
    title: `${siteName} Terms of Service`,
    description:
      "Read the full Terms of Service for SERP Apps software, including license rights, acceptable use, refund policy, and legal obligations.",
    alternates: {
      canonical: `${baseUrl}/legal/terms`,
    },
    openGraph: {
      type: "article",
      title: `${siteName} Terms of Service`,
      description:
        "Understand eligibility, license scope, refunds, acceptable use, and other conditions that apply when using SERP Apps products.",
      url: `${baseUrl}/legal/terms`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${siteName} Terms of Service`,
      description: "Official Terms of Service for SERP Apps software products.",
    },
  };
}

export default function TermsOfServicePage() {
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
              { label: "Terms of Service" },
            ]}
          />
          <article className="prose prose-slate dark:prose-invert mt-6 space-y-6">
            <header>
              <h1>Terms of Service</h1>
              <p>
                <em>Last updated: {LAST_UPDATED_LABEL}</em>
              </p>
              <p>
                These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the software products, landing pages, and related services
                (collectively, the &ldquo;Services&rdquo;) provided by {siteName} and its affiliates (&ldquo;Company&rdquo;, &ldquo;we&rdquo;,
                &ldquo;us&rdquo;, or &ldquo;our&rdquo;). By purchasing,
                downloading, installing, or otherwise using the Services, you agree to be bound by these Terms. If you do not agree, do not use the
                Services.
              </p>
            </header>

            <section>
              <h2>1. Eligibility &amp; Account Responsibilities</h2>
              <p>
                You must be at least 18 years old, or the age of majority in your jurisdiction, to purchase and use the Services. You are
                responsible for maintaining the accuracy of the contact and billing information you provide and for all activity that occurs under
                your account, even if performed by third parties that you authorize.
              </p>
            </section>

            <section>
              <h2>2. License &amp; Permitted Use</h2>
              <p>
                Upon purchase, the Company grants you a non-exclusive, non-transferable, revocable license to install and use the software for your
                own internal business or personal purposes, subject to any license limits (e.g., number of users, domains, or installations)
                disclosed at the time of purchase.
              </p>
              <p>You may not:</p>
              <ul>
                <li>Resell, redistribute, share, or sublicense the license key or Services without prior written consent.</li>
                <li>Reverse engineer, decompile, or attempt to derive the source code, except as permitted by applicable law.</li>
                <li>Use the Services to engage in any unlawful, infringing, or harmful activity.</li>
                <li>Circumvent, bypass, or attempt to bypass any licensing controls or technical restrictions implemented to protect the Services.</li>
              </ul>
            </section>

            <section>
              <h2>3. Payment &amp; Renewals</h2>
              <p>
                All fees are due at the time of purchase unless explicitly stated otherwise on the checkout page. Pricing and renewal terms (for any
                subscription or ongoing services) are disclosed before you submit payment. You authorize us and our payment processors to charge the
                payment method you provide for all purchases, renewals, add-ons, and applicable taxes.
              </p>
            </section>

            <section>
              <h2>4. Refund Policy</h2>
              <p>All sales are final. We do not offer refunds on any products or services once a purchase is completed.</p>
              <p>
                Upon successful payment, a unique license key is automatically generated and sent to the email address you provided at checkout.
                This grants you immediate access to the software and includes instructions for downloading/installing the product, walkthrough
                videos to help with setup, and multiple ways to contact our support team if you need assistance.
              </p>
              <p>We stand behind the quality of our products:</p>
              <ul>
                <li>If you encounter bugs or technical issues, we will work with you to resolve them promptly.</li>
                <li>If essential features are missing or not working as described, we will prioritize addressing them where feasible.</li>
              </ul>
              <p>
                It is your responsibility to ensure your system meets any technical requirements before purchasing. If you are unsure, please reach
                out to our team before completing your purchase.
              </p>
              <p>
                By making a purchase, you agree to this refund policy and acknowledge that you are receiving immediate access to the product and
                license key, delivery is complete when the email with license and instructions is sent, and you waive any right to initiate a
                chargeback or dispute on the basis of non-refundability for delivered digital goods.
              </p>
              <p>
                Refund requests are governed by our {" "}
                <a href="https://github.com/serpapps/legal/blob/main/refund-policy.md" target="_blank" rel="noreferrer">
                  Refund Policy
                </a>
                . Unless otherwise required by law, all sales are considered final once the license key or download link has been delivered.
              </p>
            </section>

            <section>
              <h2>5. Updates &amp; Support</h2>
              <p>
                We may release updates, bug fixes, or new features from time to time. Unless your purchase explicitly includes ongoing support, we
                make no guarantee regarding future updates or technical assistance. When support is provided, it is limited to reasonable efforts to
                address product defects or setup questions.
              </p>
            </section>

            <section>
              <h2>6. Third-Party Services</h2>
              <p>
                Some Services may interface with third-party platforms (such as payment processors, CRM systems, or video hosting providers). Your
                use of those platforms is subject to their own terms and policies. We are not responsible for any third-party service outages,
                changes, or limitations that impact the functionality of our Services.
              </p>
            </section>

            <section>
              <h2>7. Intellectual Property</h2>
              <p>
                All intellectual property rights in the Services remain with the Company or its licensors. Trademarks, logos, and product names
                referenced are the property of their respective owners. Nothing in these Terms transfers ownership of any intellectual property
                rights to you.
              </p>
            </section>

            <section>
              <h2>8. Acceptable Use &amp; Compliance</h2>
              <p>
                You agree not to use the Services to violate any applicable laws, regulations, or rights of third parties, including intellectual
                property rights and privacy laws. You are solely responsible for ensuring that your use of downloaded or captured content complies
                with the terms of the source platform and any licenses granted by content owners.
              </p>
            </section>

            <section>
              <h2>9. Authorized Use, Compliance &amp; Fair Use</h2>
              <p>
                <strong>Authorized Use Only:</strong> You may use the Services only with content you own, have created yourself, or have been
                expressly authorized to download, copy, or process by the content owner or platform. You are responsible for ensuring your use
                complies with any applicable third-party terms (including video-hosting or social-media platform terms) governing access,
                downloading, or reuse of content.
              </p>
              <p>
                <strong>No Circumvention:</strong> You may not use the Services to decrypt, bypass, remove, or otherwise circumvent any digital
                rights management (DRM), encryption, access control, or other technical protection measures. Doing so may violate 17 U.S.C. § 1201
                and similar laws.
              </p>
              <p>
                <strong>No Affiliation; Nominative Use:</strong> Third-party names, trademarks, or service marks referenced within the Services are
                used solely to identify compatibility or supported platforms. We are not affiliated with, endorsed, or sponsored by any third
                parties. You may not imply sponsorship, endorsement, or affiliation when using the Services.
              </p>
              <p>
                <strong>Repeat-Infringer Policy:</strong> In accordance with 17 U.S.C. § 512(i), we maintain and reasonably implement a policy to
                terminate or restrict users who are repeat infringers in appropriate circumstances.
              </p>
              <p>
                <strong>Indemnification:</strong> You agree to indemnify, defend, and hold harmless the Company, its affiliates, officers,
                employees, and agents from and against any claims, damages, liabilities, losses, or expenses (including reasonable attorneys’ fees)
                arising from or related to your misuse of the Services, violation of these Terms, infringement of third-party rights, or breach of
                applicable law.
              </p>
            </section>

            <section>
              <h2>10. Disclaimers &amp; Limitation of Liability</h2>
              <p>
                The Services are provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, whether express or
                implied, including but not
                limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. To the maximum extent permitted by
                law, the Company shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or for lost profits
                or data, arising out of or related to your use of the Services.
              </p>
              <p>
                Our total cumulative liability for any claim arising out of or relating to the Services is limited to the amount you paid for the
                applicable product in the twelve (12) months preceding the event giving rise to the claim.
              </p>
            </section>

            <section>
              <h2>11. Termination</h2>
              <p>
                We may suspend or terminate your access to the Services at any time if we believe you have violated these Terms or engaged in
                fraudulent, abusive, or unlawful activity. Upon termination, your license to use the Services immediately ends, and you must cease
                all use.
              </p>
            </section>

            <section>
              <h2>12. Changes to These Terms</h2>
              <p>
                We may update these Terms from time to time by posting an updated version at the URL provided. Changes become effective on the
                &ldquo;Last updated&rdquo; date noted above. Your continued use of the Services after changes are posted constitutes your acceptance of
                the revised Terms.
              </p>
            </section>

            <section>
              <h2>13. Governing Law &amp; Dispute Resolution</h2>
              <p>
                These Terms are governed by and construed in accordance with the laws of the State of California, without regard to its
                conflict-of-law principles. Any disputes arising under or in connection with the Services shall be resolved in the state or federal
                courts located in San Francisco County, California, and you consent to the personal jurisdiction of such courts.
              </p>
            </section>

            <section>
              <h2>14. Delivery of Digital Products</h2>
              <p>
                Upon successful payment, a unique license key and access instructions will be delivered to the email address you provided at
                checkout. This includes your license key, download and installation instructions, walkthrough videos, and multiple ways to contact
                our support team.
              </p>
              <p>
                Delivery is considered complete once the email is successfully sent. It is your responsibility to ensure the accuracy and
                accessibility of your email address and to check spam/junk folders. We are not responsible for issues caused by incorrect email
                information or spam filtering.
              </p>
            </section>

            <section>
              <h2>15. Chargebacks &amp; Payment Disputes</h2>
              <p>
                By purchasing our Services, you agree not to initiate chargebacks or payment disputes without first contacting our support team and
                giving us a chance to resolve any concerns. Unauthorized chargebacks may result in immediate suspension or termination of your
                license and access.
              </p>
              <p>
                We reserve the right to challenge disputes using proof of delivery, license issuance, and your acceptance of these Terms. We may
                also report chargeback abuse to fraud prevention databases or take legal action to recover costs.
              </p>
            </section>

            <section>
              <h2>16. No Guarantee of Results</h2>
              <p>
                While we aim to provide high-quality tools and support, we do not guarantee any specific outcomes or results through the use of our
                Services. Your results may vary depending on implementation, third-party changes, or external factors beyond our control.
              </p>
            </section>

            <section>
              <h2>17. Contact Us</h2>
              <p>If you have questions about these Terms or the Services, please contact us.</p>
              <p>
                By installing, accessing, or using the Services, you acknowledge that you have read, understood, and agreed to these Terms of
                Service.
              </p>
            </section>
          </article>
        </div>
      </main>
    </>
  );
}
