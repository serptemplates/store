import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";

import { getProductData } from "@/lib/product";
import type { ProductData } from "@/lib/product-schema";
import { getSiteConfig } from "@/lib/site-config";
import { Footer as FooterComposite } from "@repo/ui/composites/Footer";
import { SiteNavbar } from "@repo/ui/composites/SiteNavbar";

export const dynamic = "force-dynamic";

interface NormalizedVideo {
  id: string;
  title: string;
  description: string;
  provider: "youtube" | "file";
  sourceUrl: string;
  embedUrl: string;
  thumbnail: string;
  uploadDate?: string;
  uploadDateISO?: string;
  duration?: string;
  durationISO?: string;
  likes?: string;
  likeCount?: number;
  views?: string;
  viewCount?: number;
  variant: "primary" | "related";
}

interface WatchPageData {
  product: ProductData;
  videos: NormalizedVideo[];
  current: NormalizedVideo;
}

function isPortraitVideo(video: NormalizedVideo): boolean {
  const needles = ["shorts", "vertical", "portrait", "reel", "story", "tiktok"];
  const source = video.sourceUrl.toLowerCase();
  const embed = video.embedUrl.toLowerCase();

  return needles.some((needle) => source.includes(needle) || embed.includes(needle));
}

function extractYoutubeId(url: string): string | null {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1) || null;
    }

    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      if (id) return id;

      const path = parsed.pathname.split("/");
      const index = path.findIndex((segment) => segment === "embed" || segment === "shorts");
      if (index !== -1 && path[index + 1]) {
        return path[index + 1];
      }
    }
  } catch (_) {
    return null;
  }

  return null;
}

function normalizeVideos(product: ProductData): NormalizedVideo[] {
  const items: NormalizedVideo[] = [];
  const seen = new Set<string>();

  const baseDescription = product.tagline || product.seo_description || product.description;

  const formatUploadDate = (raw?: string): { display: string; iso: string } | undefined => {
    if (!raw || raw.length !== 8) return undefined;
    const year = raw.slice(0, 4);
    const month = raw.slice(4, 6);
    const day = raw.slice(6, 8);
    const display = `${year}-${month}-${day}`;
    const iso = `${year}-${month}-${day}T00:00:00Z`;
    return { display, iso };
  };

  const toIsoDuration = (seconds: number): string => {
    const totalSeconds = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    let iso = "PT";
    if (hours) iso += `${hours}H`;
    if (minutes) iso += `${minutes}M`;
    iso += `${secs}S`;
    return iso;
  };

  const formatDuration = (
    duration?: number,
    fallback?: string,
  ): { display?: string; iso?: string } | undefined => {
    if (typeof duration === "number" && Number.isFinite(duration)) {
      const displayMinutes = Math.floor(Math.max(0, Math.floor(duration)) / 60);
      const displaySeconds = Math.max(0, Math.floor(duration)) % 60;
      const display = `${displayMinutes}:${displaySeconds.toString().padStart(2, "0")}`;
      return { display: fallback ?? display, iso: toIsoDuration(duration) };
    }

    if (fallback) {
      return { display: fallback };
    }

    return undefined;
  };

  const formatCount = (value?: number): { display: string; raw: number } | undefined => {
    if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
    return {
      display: value.toLocaleString(),
      raw: value,
    };
  };

  const appendVideo = (
    entry: ProductData["product_videos"][number] | ProductData["related_videos"][number],
    index: number,
    variant: "primary" | "related",
  ) => {
    const data = typeof entry === "string" ? { url: entry } : entry;
    const url = data?.url ?? (typeof entry === "string" ? entry : undefined);
    if (!url) return;

    const youtubeId = extractYoutubeId(url);
    const provider: NormalizedVideo["provider"] = youtubeId ? "youtube" : "file";
    const baseId = data?.id ?? youtubeId ?? `video-${variant}-${index}`;
    const id = baseId;

    if (seen.has(id)) return;
    seen.add(id);

    const titleSuffix = variant === "primary" ? "Demo" : "Related";

    const embedUrl = youtubeId
      ? `https://www.youtube.com/embed/${youtubeId}`
      : url;

    const thumbnail = youtubeId
      ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
      : data?.thumbnail_url ||
        product.featured_image ||
        "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=900&q=80";

    const description = data?.description ?? baseDescription;
    const uploadDate = formatUploadDate(data?.upload_date);
    const duration = formatDuration(data?.duration, data?.duration_string);
    const likes = formatCount(data?.like_count);
    const views = formatCount(data?.view_count);

    items.push({
      id,
      title: data?.title ?? `${product.name} ${titleSuffix} ${index + 1}`,
      description,
      provider,
      sourceUrl: url,
      embedUrl,
      thumbnail,
      uploadDate: uploadDate?.display,
      uploadDateISO: uploadDate?.iso,
      duration: duration?.display,
      durationISO: duration?.iso,
      likes: likes?.display,
      likeCount: likes?.raw,
      views: views?.display,
      viewCount: views?.raw,
      variant,
    });
  };

  (product.product_videos ?? []).forEach((entry, index) => appendVideo(entry, index, "primary"));
  (product.related_videos ?? []).forEach((entry, index) => appendVideo(entry, index, "related"));

  return items;
}

function loadWatchPageData(slug: string, videoId: string): WatchPageData {
  let product: ProductData;
  try {
    product = getProductData(slug);
  } catch (_) {
    notFound();
  }

  const videos = normalizeVideos(product);
  if (process.env.NODE_ENV !== "production") {
    console.log(`[watch] slug=${slug} videos=${videos.length}`);
  }
  if (videos.length === 0) {
    notFound();
  }

  const current = videos.find((video) => video.id === videoId) ?? videos[0];

  return { product, videos, current };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; videoId: string }>;
}) {
  const { slug, videoId } = await params;
  const { product, current } = loadWatchPageData(slug, videoId);

  return {
    title: `${current.title} | ${product.name}`,
    description: current.description,
    openGraph: {
      title: current.title,
      description: current.description,
      type: "video.other",
      url: `https://apps.serp.co/watch/${product.slug}/${current.id}`,
      images: [
        {
          url: current.thumbnail,
          width: 1200,
          height: 630,
          alt: current.title,
        },
      ],
      videos: [
        {
          url: current.embedUrl,
          secureUrl: current.embedUrl,
        },
      ],
    },
  };
}

export default async function WatchPage({
  params,
}: {
  params: Promise<{ slug: string; videoId: string }>;
}) {
  const { slug, videoId } = await params;
  const { product, videos, current } = loadWatchPageData(slug, videoId);
  const siteConfig = getSiteConfig();

  const moreVideos = videos.filter((video) => video.id !== current.id);
  const currentDuration = current.duration ?? (current.variant === "primary" ? "~2 min" : "~1 min");
  const currentViews = current.views ?? "—";
  const currentLikes = current.likes ?? "—";
  const uploadDate = current.uploadDate ? new Date(current.uploadDate).toLocaleDateString() : "—";
  const portrait = isPortraitVideo(current);
  const aspectRatio = portrait ? "9 / 16" : "16 / 9";
  const siteName = siteConfig.site?.name ?? "SERP Apps";
  const primaryCtaHref = siteConfig.cta?.href;
  const canonicalHostRaw = siteConfig.site?.domain
    ? siteConfig.site.domain.startsWith("http")
      ? siteConfig.site.domain
      : `https://${siteConfig.site.domain}`
    : "https://store.serp.co";
  const canonicalHost = canonicalHostRaw.replace(/\/$/, "");
  const canonicalWatchUrl = `${canonicalHost}/watch/${product.slug}/${current.id}`;
  const productUrl = `${canonicalHost}/${product.slug}`;

  const interactionStatistic: Array<Record<string, unknown>> = [];
  if (typeof current.viewCount === "number") {
    interactionStatistic.push({
      "@type": "InteractionCounter",
      interactionType: "http://schema.org/WatchAction",
      userInteractionCount: current.viewCount,
    });
  }
  if (typeof current.likeCount === "number") {
    interactionStatistic.push({
      "@type": "InteractionCounter",
      interactionType: "http://schema.org/LikeAction",
      userInteractionCount: current.likeCount,
    });
  }

  const publisher = siteName || siteConfig.site?.logo
    ? {
        "@type": "Organization",
        ...(siteName ? { name: siteName } : {}),
        ...(siteConfig.site?.logo
          ? {
              logo: {
                "@type": "ImageObject",
                url: siteConfig.site.logo,
              },
            }
          : {}),
      }
    : undefined;

  const videoObject: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: current.title,
    description: current.description,
    thumbnailUrl: [current.thumbnail],
    uploadDate: current.uploadDateISO ?? current.uploadDate,
    embedUrl: current.embedUrl,
    contentUrl: current.sourceUrl,
    isFamilyFriendly: true,
    potentialAction: {
      "@type": "WatchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: canonicalWatchUrl,
        actionPlatform: [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/MobileWebPlatform",
        ],
      },
    },
    mainEntityOfPage: canonicalWatchUrl,
  };

  if (publisher) {
    videoObject.publisher = publisher;
  }
  if (current.durationISO) {
    videoObject.duration = current.durationISO;
  }
  if (interactionStatistic.length > 0) {
    videoObject.interactionStatistic = interactionStatistic;
  }
  if (product.purchase_url) {
    videoObject.sameAs = product.purchase_url;
  }

  const breadcrumbList = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: siteName,
        item: canonicalHost,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: product.name,
        item: productUrl,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: current.title,
        item: canonicalWatchUrl,
      },
    ],
  };

  const videoJsonLd = JSON.stringify(videoObject);
  const breadcrumbsJsonLd = JSON.stringify(breadcrumbList);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteNavbar
        site={{ name: siteName, categories: [], buyUrl: primaryCtaHref }}
        Link={Link}
        ctaHref={primaryCtaHref}
        ctaText={siteConfig.cta?.text}
        showLinks={false}
        showCta={false}
      />

      <Script id={`video-schema-${current.id}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: videoJsonLd }} />
      <Script id={`breadcrumb-schema-${current.id}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbsJsonLd }} />

      <main className="flex-1 bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 pb-16 pt-10 lg:flex-row lg:gap-16">
          <section className="flex w-full flex-1 flex-col gap-8">
            <div
              className={`relative w-full overflow-hidden rounded-xl border border-border/60 bg-black shadow-xl ${
                portrait ? "mx-auto max-w-[min(100%,32rem)]" : "mx-auto w-full"
              }`}
              style={{ aspectRatio, maxWidth: portrait ? undefined : "min(100%, 1200px)" }}
            >
              <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-4 text-xs uppercase tracking-[0.2em] text-white/70">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 animate-pulse rounded-full bg-rose-500" />
                  Now Playing
                </span>
                <span>{currentDuration}</span>
              </div>
              {current.provider === "youtube" ? (
                <iframe
                  className="relative z-0 h-full w-full bg-black"
                  src={`${current.embedUrl}?rel=0`}
                  title={current.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <video
                  className="relative z-0 h-full w-full bg-black object-cover"
                  controls
                  poster={current.thumbnail}
                  src={current.sourceUrl}
                />
              )}
              <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-6">
                <div className="mb-3 flex items-center gap-3 text-sm text-white/80">
                  <span className="rounded-full bg-white/10 px-3 py-1">{currentViews} views</span>
                  <span className="rounded-full bg-white/10 px-3 py-1">{currentLikes} likes</span>
                </div>
                <h1 className="text-2xl font-semibold text-white lg:text-4xl">{current.title}</h1>
                <p className="mt-3 max-w-3xl text-sm text-white/80 lg:text-base">
                  {current.description}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-8">
              <div className="rounded-xl border border-border/60 bg-white p-6 shadow-sm dark:bg-zinc-900">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 overflow-hidden rounded-2xl">
                      <Image
                        src={product.featured_image || current.thumbnail}
                        alt={`${product.name} cover`}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2 text-xs uppercase tracking-[0.3em] text-rose-700">
                        {(product.categories ?? []).map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>
                      <h2 className="text-lg font-semibold lg:text-xl">{product.name}</h2>
                      <p className="text-sm text-muted-foreground">{product.tagline}</p>
                    </div>
                  </div>
                  <a
                    href={product.buy_button_destination || product.purchase_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-rose-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-rose-600 md:w-auto"
                  >
                    {product.pricing?.cta_text || "Start Downloading"}
                  </a>
                </div>
              </div>

              <div className="grid gap-8 md:grid-cols-2">
                <div className="rounded-xl border border-border/60 bg-white p-6 shadow-sm dark:bg-zinc-900">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">Video details</h3>
                  <dl className="mt-4 space-y-3 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <dt>Uploaded</dt>
                      <dd>{uploadDate}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Length</dt>
                      <dd>{currentDuration}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-xl border border-border/60 bg-white p-6 shadow-sm dark:bg-zinc-900">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">Actions</h3>
                  <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
                    <button className="rounded-full border border-border px-4 py-2 text-left transition hover:bg-muted/60">
                      Share Video
                    </button>
                    <button className="rounded-full border border-border px-4 py-2 text-left transition hover:bg-muted/60">
                      Save to Library
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="flex w-full max-w-sm flex-col gap-8">
            <div className="rounded-xl border border-border/60 bg-white p-6 shadow-sm dark:bg-zinc-900">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">More like this</h3>
              <div className="space-y-4">
                {moreVideos.length === 0 && (
                  <p className="text-sm text-muted-foreground">More videos coming soon.</p>
                )}
                {moreVideos.map((video) => (
                  <a
                    key={video.id}
                    href={`/watch/${product.slug}/${video.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border/60 p-3 transition hover:bg-muted/60"
                  >
                    <div className="relative h-16 w-12 overflow-hidden rounded-xl">
                      <Image
                        src={video.thumbnail}
                        alt={video.title}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{video.title}</p>
                      <p className="text-xs text-muted-foreground">{video.duration ?? "Watch now"}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>

      <FooterComposite site={{ name: siteName }} />
    </div>
  );
}
