import NextLink from "next/link";
import { SiteNavbar } from "@repo/ui/composites/SiteNavbar";
import { Footer } from "@/components/Footer";
import { siteConfig } from "@/site.config";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: `Privacy Policy | ${siteConfig.name}`,
  description: `Privacy Policy for ${siteConfig.name} - Learn how we protect your data and privacy.`,
};

export default function PrivacyPage() {
  return (
    <>
      <SiteNavbar site={{ name: siteConfig.name, categories: siteConfig.categories, buyUrl: siteConfig.buyUrl }} Link={NextLink} ctaText="Get It Now" />
      <main className="min-h-screen bg-background">
        <div className="container max-w-4xl py-12 md:py-20">
          <h1 className="mb-8 text-4xl font-bold">Privacy Policy</h1>
          
          <div className="prose prose-gray max-w-none dark:prose-invert">
            <p className="text-lg text-muted-foreground">
              Last updated: January 8, 2025
            </p>

            <h2>Introduction</h2>
            <p>
              At {siteConfig.name}, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your information when you use our video downloading service.
            </p>

            <h2>Information We Collect</h2>
            <h3>Information You Provide</h3>
            <ul>
              <li>Video URLs you submit for processing</li>
              <li>Contact information if you reach out to us</li>
              <li>Feedback and correspondence</li>
            </ul>

            <h3>Automatically Collected Information</h3>
            <ul>
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Device information</li>
              <li>Usage data and analytics</li>
              <li>Cookies and similar technologies</li>
            </ul>

            <h2>How We Use Your Information</h2>
            <p>We use the collected information to:</p>
            <ul>
              <li>Process your video download requests</li>
              <li>Improve our service and user experience</li>
              <li>Analyze usage patterns and trends</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Prevent abuse and maintain security</li>
            </ul>

            <h2>Data Storage and Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no internet transmission is completely secure, and we cannot guarantee absolute security.
            </p>

            <h2>Data Retention</h2>
            <p>
              We do not store the videos you download or their content. Video URLs are processed in real-time and are not retained after processing. Analytics data may be retained for up to 90 days.
            </p>

            <h2>Third-Party Services</h2>
            <p>
              Our service may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies.
            </p>

            <h2>Cookies</h2>
            <p>
              We use cookies to enhance your experience, analyze site traffic, and understand usage patterns. You can control cookie preferences through your browser settings.
            </p>

            <h2>Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to data processing</li>
              <li>Data portability</li>
            </ul>

            <h2>Children&apos;s Privacy</h2>
            <p>
              Our service is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected such information, please contact us immediately.
            </p>

            <h2>Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
            </p>

            <h2>Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at:
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
