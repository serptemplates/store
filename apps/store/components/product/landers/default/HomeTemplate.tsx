"use client";

import { FaYoutube } from "react-icons/fa6";
import Hero from "@repo/ui/components/hero";
import { PricingCta } from "@repo/ui/sections/PricingCta";
import { FeaturesSection } from "@repo/ui/sections/FeaturesSection";
import { SocialProofScreenshots } from "@repo/ui/sections/SocialProofScreenshots";
import { PostsSection } from "@repo/ui/sections/PostsSection";
import { AboutSection } from "@repo/ui/sections/AboutSection";
import { FaqAccordion } from "@/components/product/landers/marketplace/sections/FaqAccordion";
import type { HomeTemplateProps } from "./home-template.types";
import { teamMembers } from "@/data/team";
import { ProductAboutSection } from "./sections/ProductAboutSection";
import { ProductResourceLinks } from "./sections/ProductResourceLinks";
import { buildHomeTemplateViewModel } from "./home-template.view-model";
import { mapPermissionItemsToFaq } from "@/components/product/shared/mapPermissionItemsToFaq";
import { ProductCategoryPills } from "@/components/product/shared/ProductCategoryPills";
import { TrademarkDisclaimer } from "@repo/ui/components/trademark-disclaimer";

export function HomeTemplate(props: HomeTemplateProps) {
  const { trademarkNotice, ...rest } = props;
  const viewModel = buildHomeTemplateViewModel({
    ...rest,
    heroVideoLinkIcon: <FaYoutube className="text-red-500" />,
  });

  const trimmedTrademarkNotice = trademarkNotice?.trim() ?? "";
  const renderTrademarkDisclaimer = (variant: "card" | "inline" = "card") =>
    trimmedTrademarkNotice ? (
      <TrademarkDisclaimer text={trimmedTrademarkNotice} variant={variant} align="center" />
    ) : null;

  const { ui } = rest;
  const {
    Navbar,
    Badge,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
  } = ui;
  const breadcrumbs = viewModel.breadcrumbs;
  const permissionFaqItems = mapPermissionItemsToFaq(viewModel.permissions);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        {breadcrumbs ? (
          <div className="border-b bg-gray-50">
            <nav
              className="mx-auto max-w-6xl px-4 py-4 text-sm text-muted-foreground"
              aria-label="Breadcrumb"
            >
              <ol className="flex flex-wrap items-center gap-2">
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  return (
                    <li
                      key={`${crumb.label}-${index}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      {crumb.href && !isLast ? (
                        <a
                          href={crumb.href}
                          className="transition-colors hover:text-primary"
                        >
                          {crumb.label}
                        </a>
                      ) : (
                        <span
                          className={isLast ? "text-foreground" : undefined}
                        >
                          {crumb.label}
                        </span>
                      )}
                      {!isLast && (
                        <span className="text-muted-foreground">/</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>
        ) : null}
        <Hero
          title={viewModel.hero.title}
          description={viewModel.hero.description}
          links={viewModel.hero.links}
          media={viewModel.hero.media}
          eyebrow={
            viewModel.categories.length > 0 ? (
              <ProductCategoryPills categories={viewModel.categories} max={3} className="justify-center" />
            ) : null
          }
          footnote={renderTrademarkDisclaimer("card")}
        />

        {viewModel.aboutSection ? (
          <ProductAboutSection
            title={viewModel.aboutSection.title}
            paragraphs={viewModel.aboutSection.paragraphs}
          />
        ) : null}

        {/* Features */}
        <FeaturesSection features={viewModel.features} />

        {/* Videos */}
        {viewModel.videoSection}

        {/* Social Proof Screenshots */}
        <SocialProofScreenshots />

        {/* FAQ */}
        {viewModel.faqItems.length > 0 ? (
          <section className="container mx-auto my-16 max-w-4xl px-4">
            <div className="mb-6 space-y-3 text-center sm:text-left">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Frequently Asked Questions
              </h2>
            </div>
            <FaqAccordion items={viewModel.faqItems} />
          </section>
        ) : null}

        {/* Pricing CTA (configurable per site) */}
        {viewModel.pricing.enabled ? (
          <PricingCta
            {...viewModel.pricing.props}
            terms={viewModel.pricing.props.terms ?? renderTrademarkDisclaimer("card")}
          />
        ) : null}

        {/* Team Section */}
        <AboutSection team={teamMembers} />

        {/* Permissions */}
        {permissionFaqItems.length > 0 ? (
          <section className="container mx-auto my-16 max-w-4xl px-4">
            <div className="mb-6 space-y-3 text-center sm:text-left">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Permissions</h2>
            </div>
            <FaqAccordion items={permissionFaqItems} />
          </section>
        ) : null}

        {viewModel.resourceLinks.length > 0 ? (
          <ProductResourceLinks links={viewModel.resourceLinks} />
        ) : null}

        {/* Posts */}
        {viewModel.posts.show && (
          <PostsSection
            posts={viewModel.posts.items}
            heading={viewModel.posts.heading ?? "Posts"}
            Badge={Badge}
            Card={Card}
            CardHeader={CardHeader}
            CardTitle={CardTitle}
            CardContent={CardContent}
            CardDescription={CardDescription}
          />
        )}
      </main>
    </>
  );
}

export default HomeTemplate;

export type { HomeTemplateProps } from "./home-template.types";
