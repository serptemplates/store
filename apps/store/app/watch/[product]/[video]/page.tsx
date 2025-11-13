import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";

import { getAllProducts, getProductData, getProductSlugs } from "@/lib/products/product";
import { getSiteConfig } from "@/lib/site-config";
import { getProductVideoEntries } from "@/lib/products/video";
import { isPreRelease } from "@/lib/products/release-status";
import { getSiteBaseUrl, toAbsoluteUrl } from "@/lib/urls";
import PrimaryNavbar from "@/components/navigation/PrimaryNavbar";
import { buildPrimaryNavProps } from "@/lib/navigation";
import { ProductBreadcrumb } from "@/components/product/ProductBreadcrumb";
import { generateBreadcrumbSchema } from "@/schema/product-schema-ld";

type WatchPageParams = { product: string; video: string };

function getWatchMetadata({ productSlug, videoSlug }: { productSlug: string; videoSlug: string }) {
  try {
    const product = getProductData(productSlug);
    const entries = getProductVideoEntries(product);
    const entry = entries.find((item) => item.slug === videoSlug);
    if (!entry) {
      return null;
    }

    const siteConfig = getSiteConfig();
    const siteName = siteConfig.site?.name ?? "SERP Apps";
    const baseUrl = getSiteBaseUrl();
    const watchUrl = `${baseUrl}${entry.watchPath}`;
    const productUrl = `${baseUrl}/${product.slug}`;
    const title = `${entry.title} — ${product.name}`;
    const description = entry.description;
    const images = entry.thumbnailUrl
      ? [
          {
            url: entry.thumbnailUrl,
            width: 1280,
            height: 720,
            alt: entry.title,
          },
        ]
      : undefined;

    const metadata: Metadata = {
      title,
      description,
      alternates: { canonical: watchUrl },
      openGraph: {
        type: "video.other",
        title,
        description,
        url: watchUrl,
        siteName,
        images,
      },
      twitter: {
        card: images ? "summary_large_image" : "summary",
        title,
        description,
        images: images?.map((image) => image.url),
      },
      other: {
        ...(entry.duration ? { "video:duration": entry.duration } : {}),
        ...(entry.uploadDate ? { "video:release_date": entry.uploadDate } : {}),
      },
      metadataBase: new URL(baseUrl),
      robots: {
        index: true,
        follow: true,
      },
    };

    return { metadata, product, entry, siteName, watchUrl, productUrl };
  } catch (error) {
    console.warn(`[watch-page] Failed to build metadata for ${productSlug}/${videoSlug}:`, error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<WatchPageParams> }): Promise<Metadata> {
  const { product: productSlug, video: videoSlug } = await params;
  const context = getWatchMetadata({ productSlug, videoSlug });
  return context?.metadata ?? {};
}

export function generateStaticParams() {
  return getProductSlugs()
    .map((slug) => {
      try {
        const product = getProductData(slug);
        return getProductVideoEntries(product).map((entry) => ({
          product: slug,
          video: entry.slug,
        }));
      } catch {
        return [] as Array<WatchPageParams>;
      }
    })
    .flat();
}

export default async function WatchPage({ params }: { params: Promise<WatchPageParams> }) {
  const { product: productSlug, video: videoSlug } = await params;
  const context = getWatchMetadata({ productSlug, videoSlug });

  if (!context) {
    notFound();
  }

  const { product, entry, siteName, watchUrl, productUrl } = context;
  const baseUrl = getSiteBaseUrl();
  const siteConfig = getSiteConfig();
  const allProducts = getAllProducts();
  const navProps = buildPrimaryNavProps({ products: allProducts, siteConfig });
  const siteRegions = product.supported_regions
    .map((region) => region.trim())
    .filter((region) => region.length > 0);
  const primaryRegion = siteRegions[0] ?? 'Worldwide';
  const sameAsUrls = [
    entry.url,
    product.store_serp_co_product_page_url,
    product.apps_serp_co_product_page_url,
    product.serply_link,
  ].filter(Boolean);

  const videoObjectSchema = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: entry.title,
    description: entry.description,
    uploadDate: entry.uploadDate,
    duration: entry.duration,
    thumbnailUrl: entry.thumbnailUrl ? [entry.thumbnailUrl] : undefined,
    contentUrl: entry.url,
    embedUrl: entry.embedUrl,
    url: watchUrl,
    mainEntityOfPage: watchUrl,
    inLanguage: "en-US",
    isFamilyFriendly: true,
    requiresSubscription: false,
    sameAs: sameAsUrls,
    regionsAllowed: siteRegions.length ? siteRegions : [primaryRegion],
    contentLocation: {
      "@type": "Place",
      name: primaryRegion,
    },
    publisher: {
      "@type": "Organization",
      name: siteName,
      logo: {
        "@type": "ImageObject",
        url: toAbsoluteUrl("/logo.svg"),
      },
    },
    potentialAction: {
      "@type": "WatchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: watchUrl,
      },
    },
    isPartOf: {
      "@type": "Product",
      name: product.name,
      url: productUrl,
    },
    offers: product.serply_link
      ? {
          "@type": "Offer",
          url: product.serply_link,
          price: product.pricing?.price?.replace(/[^0-9.]/g, "") || "0",
          priceCurrency: "USD",
          availability: isPreRelease(product) ? "https://schema.org/PreOrder" : "https://schema.org/InStock",
        }
      : undefined,
    videoQuality: "HD",
  };

  const breadcrumbSchema = generateBreadcrumbSchema({
    items: [
      { name: "Home", url: "/" },
      { name: "Videos", url: "/videos" },
      { name: product.name, url: productUrl },
      { name: entry.title, url: entry.watchPath },
    ],
    storeUrl: baseUrl,
  });

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${watchUrl}#webpage`,
    url: watchUrl,
    name: entry.title,
    description: entry.description,
    primaryImageOfPage: entry.thumbnailUrl,
    isPartOf: {
      "@type": "CollectionPage",
      url: `${baseUrl}/videos`,
      name: "Videos",
    },
  };

  return (
    <>
      <PrimaryNavbar {...navProps} />
      <main className="min-h-screen bg-white text-gray-900">
      <Script id="video-object-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoObjectSchema) }} />
      <Script id="breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Script id="watch-webpage-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />

      <div className="border-b bg-gray-50">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-4">
          <ProductBreadcrumb
            className="text-sm text-gray-600"
            items={[
              { label: "Home", href: "/" },
              { label: "Videos", href: "/videos" },
              { label: product.name, href: productUrl },
              { label: entry.title },
            ]}
          />
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 lg:flex-row lg:items-start lg:gap-12">
        <article className="flex-1">
          <header className="mb-6">
            <h1 className="text-3xl font-semibold text-gray-900">{entry.title}</h1>
          </header>

          <div className="relative mb-6 overflow-hidden rounded-xl bg-black shadow-lg">
            <div className="aspect-video w-full">
              <iframe
                src={entry.embedUrl}
                title={entry.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Get the tool</h2>
            <p className="mt-2 text-sm text-gray-600">
              Like what you saw? Explore the full product page for {product.name} and get instant access.
            </p>
            <div className="mt-4">
              <Link
                href={`/${product.slug}`}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Visit product page
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </article>

        <aside className="w-full max-w-md space-y-6 lg:w-80">
          <section className="rounded-lg border border-gray-200 bg-gray-50 p-5">
            <h2 className="text-base font-semibold text-gray-900">More videos</h2>
            <ul className="mt-4 space-y-3">
              {getProductVideoEntries(product)
                .filter((item) => item.slug !== entry.slug)
                .map((video) => (
                  <li key={video.slug}>
                    <Link href={video.watchPath} className="group flex gap-3 rounded-lg border border-transparent p-2 transition hover:border-blue-200 hover:bg-white">
                      <div className="h-16 w-24 flex-shrink-0 overflow-hidden rounded-md bg-gray-200">
                        {video.thumbnailUrl ? (
                          <Image
                            src={video.thumbnailUrl}
                            alt={video.title}
                            width={192}
                            height={108}
                            className="h-full w-full object-cover"
                            sizes="(max-width: 640px) 50vw, 192px"
                            quality={75}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">Video</div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 group-hover:text-blue-700">{video.title}</span>
                      </div>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        </aside>
      </div>
      </main>
    </>
  );
}
