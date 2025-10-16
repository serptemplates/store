"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { TypographyH1, TypographyP, TypographySmall } from "@repo/ui";
import HeroVideoDialog from "../magic/HeroVideoDialog";
import { Progress } from "../progress";



export type HeroMediaItem =
  | {
      type: "video";
      src: string;
      lightThumbnailSrc?: string;
      darkThumbnailSrc?: string;
      alt?: string;
      title?: string;
    }
  | {
      type: "image";
      src: string;
      alt?: string;
      title?: string;
    };


type HeroProps = {
  badgeText: string;
  heroTitle: string;
  heroDescription: string;
  ctaHref: string; // kept for future routing/purchase flow; not used now
  ctaText?: string; // default: Get It Now
  secondaryCtaText?: string; // e.g., Try Demo
  highlight?: string; // text to gradient-highlight within title
  bullets?: string[]; // optional checklist items (2 columns)
  videoSrc?: string; // optional video url to show on the right
  videoTitle?: string; // accessible title for the iframe
  lightThumbnailSrc?: string;
  darkThumbnailSrc?: string;
  thumbnailAlt?: string;
  mediaItems?: HeroMediaItem[];
  ui: {
    Badge: ComponentType<any>;
    Button: ComponentType<any>;
  };
};

function getYouTubeThumbnail(videoUrl: string): string | undefined {
  const pattern = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|live\/))([A-Za-z0-9_-]{6,})/;
  const match = videoUrl.match(pattern);
  const videoId = match?.[1];
  if (!videoId) {
    return undefined;
  }
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function Hero({
  badgeText,
  heroTitle,
  heroDescription,
  ctaHref,
  ctaText = "Get It Now",
  secondaryCtaText = "Try Demo",
  highlight,
  bullets,
  videoSrc,
  videoTitle = "Demo video",
  lightThumbnailSrc,
  darkThumbnailSrc,
  thumbnailAlt = "Hero Video",
  mediaItems,
  ui,
}: HeroProps) {
  const { Badge } = ui;

  // Determine highlighted part of the title
  let before = "";
  let hi = "";
  let after = "";
  if (highlight && heroTitle.toLowerCase().includes(highlight.toLowerCase())) {
    const idx = heroTitle.toLowerCase().indexOf(highlight.toLowerCase());
    before = heroTitle.slice(0, idx);
    hi = heroTitle.slice(idx, idx + highlight.length);
    after = heroTitle.slice(idx + highlight.length);
  } else {
    const parts = heroTitle.split(/\s+/);
    hi = parts.shift() ?? "";
    before = "";
    after = parts.join(" ");
  }

  const checklist: string[] | undefined = bullets ?? [
    "Fast and reliable",
    "No signup required",
    "Works on desktop & mobile",
    "Privacy-friendly",
    "Simple, clean UI",
    "Free to start",
  ];

  const carouselItems = useMemo<HeroMediaItem[]>(() => {
    const resolveThumbnails = (itemsToMap: HeroMediaItem[]): HeroMediaItem[] =>
      itemsToMap.map((item) => {
        if (item.type !== "video") {
          return item;
        }

        if (item.lightThumbnailSrc || item.darkThumbnailSrc) {
          return item;
        }

        const thumbnail = getYouTubeThumbnail(item.src);
        if (!thumbnail) {
          return item;
        }

        return {
          ...item,
          lightThumbnailSrc: thumbnail,
          darkThumbnailSrc: thumbnail,
        };
      });

    if (Array.isArray(mediaItems) && mediaItems.length > 0) {
      return resolveThumbnails(mediaItems);
    }

    if (videoSrc) {
      return resolveThumbnails([
        {
          type: "video",
          src: videoSrc,
          lightThumbnailSrc,
          darkThumbnailSrc,
          alt: videoTitle,
          title: videoTitle,
        },
      ]);
    }

    return [];
  }, [mediaItems, videoSrc, lightThumbnailSrc, darkThumbnailSrc, videoTitle]);

  const hasMedia = carouselItems.length > 0;

  return (
    <section className="relative overflow-hidden bg-background">
      <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]" />
      <div className="container relative py-16 md:py-24 lg:py-28">
        <div
          className={`mx-auto grid max-w-6xl items-center gap-10 ${hasMedia ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}
        >
          {/* Left: text content */}
          <div className="text-center lg:text-left">
            <TypographyH1 className="mb-6 text-4xl font-semibold md:text-5xl lg:text-6xl">
              {before}
              <span className="bg-gradient-to-r from-primary via-fuchsia-500 to-emerald-500 bg-clip-text text-transparent">
                {` ${hi} `}
              </span>
              {after}
            </TypographyH1>

            <TypographyP className="mb-6 lg:max-w-xl lg:pr-4">
              {heroDescription}
            </TypographyP>

            {Array.isArray(checklist) && checklist.length > 0 && (
              <div className="mb-8 grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto">
                {checklist.slice(0, 6).map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <TypographySmall className="leading-normal">{item}</TypographySmall>
                  </div>
                ))}
              </div>
            )}

            {/* CTA button removed to keep single primary CTA in navbar */}
          </div>

          {hasMedia && (
            <div className="relative mx-auto w-full max-w-xl lg:max-w-[640px]">
              <HeroMediaCarousel items={carouselItems} />
            </div>
          )}
        </div>
  
      </div>
    </section>
  );
}

function HeroMediaCarousel({ items }: { items: HeroMediaItem[] }) {
  // Filter out invalid items
  const validItems = items.filter(item => item.src && item.src.trim() !== '');

  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", loop: validItems.length > 1, containScroll: "trimSnaps" });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    const handleSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    handleSelect();
    emblaApi.on("select", handleSelect);
    emblaApi.on("reInit", handleSelect);

    return () => {
      emblaApi.off("select", handleSelect);
      emblaApi.off("reInit", handleSelect);
    };
  }, [emblaApi]);

  const onPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const onNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const progress = validItems.length > 0 ? ((selectedIndex + 1) / validItems.length) * 100 : 0;

  const imageIndices = useMemo(() => validItems.flatMap((item, index) => (item.type === "image" ? [index] : [])), [validItems]);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const showPrevImage = useCallback(() => {
    setLightboxIndex((current) => {
      if (current === null) return current;
      const position = imageIndices.indexOf(current);
      if (position === -1 || imageIndices.length === 0) return current;
      const nextIndex = imageIndices[(position - 1 + imageIndices.length) % imageIndices.length];
      return nextIndex;
    });
  }, [imageIndices]);

  const showNextImage = useCallback(() => {
    setLightboxIndex((current) => {
      if (current === null) return current;
      const position = imageIndices.indexOf(current);
      if (position === -1 || imageIndices.length === 0) return current;
      const nextIndex = imageIndices[(position + 1) % imageIndices.length];
      return nextIndex;
    });
  }, [imageIndices]);

  useEffect(() => {
    if (lightboxIndex === null) {
      return;
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPrevImage();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        showNextImage();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxIndex, closeLightbox, showPrevImage, showNextImage]);

  // Don't render anything if no valid items
  if (validItems.length === 0) {
    return null;
  }

  return (
    <div className="group relative">
      <div ref={emblaRef} className="overflow-hidden rounded-2xl">
        <div className="flex">
          {validItems.map((item, index) => (
            <div key={index} className="min-w-0 shrink-0 grow-0 basis-full">
              {item.type === "video" ? (
                <div className="relative">
                  <HeroVideoDialog
                    className="block dark:hidden"
                    animationStyle="from-center"
                    videoSrc={item.src}
                    thumbnailSrc={item.lightThumbnailSrc ?? item.darkThumbnailSrc}
                    thumbnailAlt={item.alt ?? item.title ?? "Product video"}
                  />
                  <HeroVideoDialog
                    className="hidden dark:block"
                    animationStyle="from-center"
                    videoSrc={item.src}
                    thumbnailSrc={item.darkThumbnailSrc ?? item.lightThumbnailSrc}
                    thumbnailAlt={item.alt ?? item.title ?? "Product video"}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  className="relative aspect-video w-full overflow-hidden rounded-2xl border bg-muted/40"
                >
                  <Image
                    src={item.src}
                    alt={item.alt ?? item.title ?? "Product screenshot"}
                    fill
                    className="object-cover transition-transform duration-200 hover:scale-[1.02]"
                    priority={index === 0}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 640px"
                    quality={90}
                  />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {validItems.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={onPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full border bg-background/80 p-2 text-foreground shadow-sm transition hover:bg-background"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={onNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rounded-full border bg-background/80 p-2 text-foreground shadow-sm transition hover:bg-background"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {validItems.length > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span className="font-medium">
            {String(selectedIndex + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
          </span>
          <Progress value={progress} className="w-28" />
        </div>
      )}

      {lightboxIndex !== null && validItems[lightboxIndex]?.type === "image" && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal
          onClick={closeLightbox}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-5xl items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close screenshot"
              onClick={closeLightbox}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white shadow transition hover:bg-black/80"
            >
              <span className="sr-only">Close</span>
              ×
            </button>

            {imageIndices.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous screenshot"
                  onClick={(event) => {
                    event.stopPropagation();
                    showPrevImage();
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-white/80 transition hover:text-white sm:left-4"
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Next screenshot"
                  onClick={(event) => {
                    event.stopPropagation();
                    showNextImage();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/80 transition hover:text-white sm:right-4"
                >
                  ›
                </button>
              </>
            )}

            <div className="relative max-h-[90vh] w-full">
              <Image
                src={validItems[lightboxIndex].src}
                alt={validItems[lightboxIndex].alt ?? validItems[lightboxIndex].title ?? "Product screenshot"}
                width={1920}
                height={1080}
                className="max-h-[90vh] w-full object-contain"
                sizes="(max-width: 1200px) 100vw, 1200px"
                quality={90}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
