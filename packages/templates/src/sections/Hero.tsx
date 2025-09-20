"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import HeroVideoDialog from "@repo/ui/magic/HeroVideoDialog";
import { Progress } from "@repo/ui";



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

    const fallback: HeroMediaItem[] = [];

    if (videoSrc) {
      fallback.push({
        type: "video",
        src: videoSrc,
        lightThumbnailSrc: lightThumbnailSrc,
        darkThumbnailSrc: darkThumbnailSrc,
        alt: videoTitle,
        title: videoTitle,
      });
    } else if (lightThumbnailSrc) {
      fallback.push({
        type: "image",
        src: lightThumbnailSrc,
        alt: thumbnailAlt ?? videoTitle,
        title: thumbnailAlt ?? videoTitle,
      });
    }

    return resolveThumbnails(fallback);
  }, [mediaItems, videoSrc, lightThumbnailSrc, darkThumbnailSrc, videoTitle, thumbnailAlt]);

  return (
    <section className="relative overflow-hidden bg-background">
      <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]" />
      <div className="container relative py-16 md:py-24 lg:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
          {/* Left: text content */}
          <div className="text-center lg:text-left">
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-5xl leading-[0.95]">
              {before}
              <span className="bg-gradient-to-r from-primary via-fuchsia-500 to-emerald-500 bg-clip-text text-transparent">
                {` ${hi} `}
              </span>
              {after}
            </h1>

            <p className="mb-6 text-lg text-muted-foreground lg:max-w-xl lg:pr-4">
              {heroDescription}
            </p>

            {Array.isArray(checklist) && checklist.length > 0 && (
              <div className="mb-8 grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto">
                {checklist.slice(0, 6).map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs">{item}</span>
                  </div>
                ))}
              </div>
            )}

            {/* CTA button removed to keep single primary CTA in navbar */}
          </div>

          {/* Right: media carousel */}
          <div className="relative mx-auto w-full max-w-xl lg:max-w-[640px]">
            {carouselItems.length > 0 ? (
              <HeroMediaCarousel items={carouselItems} />
            ) : (
              <div className="aspect-video w-full overflow-hidden rounded-2xl border bg-muted/40" />
            )}
          </div>
        </div>
  
      </div>
    </section>
  );
}

function HeroMediaCarousel({ items }: { items: HeroMediaItem[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", loop: items.length > 1, containScroll: "trimSnaps" });
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

  const progress = items.length > 0 ? ((selectedIndex + 1) / items.length) * 100 : 0;

  const imageIndices = useMemo(() => items.flatMap((item, index) => (item.type === "image" ? [index] : [])), [items]);

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

  return (
    <div className="group relative">
      <div ref={emblaRef} className="overflow-hidden rounded-2xl">
        <div className="flex">
          {items.map((item, index) => (
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
                  className="aspect-video w-full overflow-hidden rounded-2xl border bg-muted/40"
                >
                  <img
                    src={item.src}
                    alt={item.alt ?? item.title ?? "Product screenshot"}
                    className="h-full w-full object-cover transition-transform duration-200 hover:scale-[1.02]"
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {items.length > 1 && (
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

      {items.length > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium">
            {String(selectedIndex + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
          </span>
          <Progress value={progress} className="w-28" />
        </div>
      )}

      {lightboxIndex !== null && items[lightboxIndex]?.type === "image" && (
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

            <img
              src={items[lightboxIndex].src}
              alt={items[lightboxIndex].alt ?? items[lightboxIndex].title ?? "Product screenshot"}
              className="max-h-[90vh] w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
