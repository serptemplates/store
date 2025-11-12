"use client";

import type { SiteConfig } from "@/lib/site-config";
import type { ProductData } from "@/lib/products/product-schema";

import { ProductStructuredDataScripts } from "@/components/product/ProductStructuredDataScripts";
import { ProductStructuredData } from "@/schema/structured-data-components";
import { GhlWaitlistModal } from "@/components/waitlist/GhlWaitlistModal";
import { MarketplaceLayout } from "@/components/product/landers/marketplace/MarketplaceLayout";
import { AppHeader } from "@/components/product/landers/marketplace/sections/AppHeader";
import { FeaturesBanner } from "@/components/product/landers/marketplace/sections/FeaturesBanner";
import { AboutBlock } from "@/components/product/landers/marketplace/sections/AboutBlock";
import { FaqAccordion } from "@/components/product/landers/marketplace/sections/FaqAccordion";
import { ReviewsList } from "@/components/product/landers/marketplace/sections/ReviewsList";
import { ProductStickyBar } from "@/components/product/shared/ProductStickyBar";
import { MetadataList } from "@/components/product/landers/marketplace/MarketplaceMetadataList";
import { SectionDivider } from "@/components/product/landers/marketplace/SectionDivider";
import { SECTION_LABEL_CLASS } from "@/components/product/landers/marketplace/constants";
import { useMarketplaceProductPageViewModel } from "@/components/product/landers/marketplace/useMarketplaceProductPageViewModel";
import { mapPermissionItemsToFaq } from "@/components/product/shared/mapPermissionItemsToFaq";
import { ProductBreadcrumb } from "@/components/product/ProductBreadcrumb";
import { productToHomeTemplate } from "@/lib/products/product-adapter";
import { ScreenshotsCarousel } from "@repo/ui/sections/ScreenshotsCarousel";

export type MarketplaceProductPageViewProps = {
  product: ProductData;
  siteConfig: SiteConfig;
};

export function MarketplaceProductPageView({ product, siteConfig }: MarketplaceProductPageViewProps) {
  const viewModel = useMarketplaceProductPageViewModel(product, siteConfig);
  const permissionFaqItems = mapPermissionItemsToFaq(viewModel.sections.permissionItems);
  // Reuse product adapter to normalize screenshots for carousel display
  const showPrices = siteConfig.storefront?.showPrices !== false;
  const homeTemplate = productToHomeTemplate(product, [], { showPrices });
  const screenshots = homeTemplate.screenshots ?? [];

  return (
    <>
      <ProductStructuredDataScripts
        product={viewModel.structuredData.product}
        posts={[]}
        siteConfig={siteConfig}
        images={
          [
            product.featured_image,
            product.featured_image_gif,
            ...(Array.isArray(product.screenshots)
              ? product.screenshots.map((s) => (typeof s === "string" ? s : s.url))
              : []),
          ].filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        }
        videoEntries={[]}
      />
      <ProductStructuredData product={product} url={viewModel.structuredData.url} />
      <GhlWaitlistModal open={viewModel.waitlistModal.isOpen} onClose={viewModel.waitlistModal.onClose} />

      {/* Breadcrumbs: always visible on marketplace/pre_release layout */}
      <div className="mx-auto w-full max-w-[1200px] px-4 pt-4 sm:px-6 lg:px-10">
        <ProductBreadcrumb
          className="text-xs text-muted-foreground"
          items={[
            { label: "Home", href: "/" },
            { label: "Products", href: "/#products" },
            { label: product.name ?? "Product" },
          ]}
        />
      </div>
      <MarketplaceLayout
        header={
          <AppHeader
            name={viewModel.layout.header.name}
            subtitle={viewModel.layout.header.subtitle}
            categories={viewModel.layout.header.categories}
            iconUrl={viewModel.layout.header.iconUrl}
            iconInitials={viewModel.layout.header.iconInitials}
            onPrimaryAction={viewModel.layout.header.onPrimaryAction}
            primaryLabel={viewModel.layout.header.primaryLabel}
          />
        }
      >
        <ProductStickyBar
          show={viewModel.stickyBar.show}
          product={viewModel.stickyBar.product}
          waitlistEnabled={viewModel.stickyBar.waitlistEnabled}
          onWaitlistClick={viewModel.stickyBar.onWaitlistClick}
          checkoutCta={viewModel.stickyBar.checkoutCta}
          onCheckoutClick={viewModel.stickyBar.onCheckoutClick}
        />

        <div className="mt-12 grid gap-y-12 lg:grid-cols-12 lg:gap-x-10">
          <aside className="hidden space-y-8 text-[14px] leading-[1.6] text-[#334155] md:flex md:flex-col lg:col-span-4">
            <MetadataList items={viewModel.metadata.rows} legalLinks={viewModel.metadata.legalLinks} />
          </aside>
          <section className="lg:col-span-8 space-y-12">
            <FeaturesBanner
              imageUrl={viewModel.sections.features.imageUrl}
              caption={viewModel.sections.features.caption}
              title={viewModel.sections.features.title}
              description={viewModel.sections.features.description}
            />
            {/* Screenshots carousel: render when screenshots available; shows multiple when provided */}
            {screenshots.length > 0 ? (
              <ScreenshotsCarousel
                images={screenshots}
                title="Screenshots"
                itemMaxHeight={520}
                itemWidth={720}
                gap={12}
                bleed={false}
                autoplay={false}
              />
            ) : null}
          </section>
          {viewModel.sections.about ? (
            <>
              <div className="lg:col-span-12">
                <SectionDivider />
              </div>
              <aside className="lg:col-span-4">
                <span className={SECTION_LABEL_CLASS}>About</span>
              </aside>
              <section className="lg:col-span-8 space-y-12">
                <AboutBlock body={viewModel.sections.about.body} />
              </section>
            </>
          ) : null}
          {viewModel.sections.faqItems.length > 0 ? (
            <>
              <div className="lg:col-span-12">
                <SectionDivider />
              </div>
              <aside className="lg:col-span-4">
                <span className={SECTION_LABEL_CLASS}>FAQs</span>
              </aside>
              <section className="lg:col-span-8">
                <FaqAccordion items={viewModel.sections.faqItems} />
              </section>
            </>
          ) : null}
          {viewModel.sections.reviewItems.length > 0 ? (
            <>
              <div className="lg:col-span-12">
                <SectionDivider />
              </div>
              <aside className="lg:col-span-4">
                <span className={SECTION_LABEL_CLASS}>Reviews</span>
              </aside>
              <section className="lg:col-span-8">
                <ReviewsList reviews={viewModel.sections.reviewItems} />
              </section>
            </>
          ) : null}
          {permissionFaqItems.length > 0 ? (
            <>
              <div className="lg:col-span-12">
                <SectionDivider />
              </div>
              <aside className="lg:col-span-4">
                <span className={SECTION_LABEL_CLASS}>Permissions</span>
              </aside>
              <section className="lg:col-span-8">
                <FaqAccordion items={permissionFaqItems} />
              </section>
            </>
          ) : null}
        </div>
      </MarketplaceLayout>
    </>
  );
}
