"use client";

<<<<<<< HEAD
import { useMemo } from "react";

import HeroMedia, { type SHeroMediaItem } from "@repo/ui/components/hero-media";
import type { Screenshot } from "@repo/ui/sections/ScreenshotsCarousel";

type FeaturesBannerProps = {
  imageUrl?: string | null;
  images?: Screenshot[];
  videos?: string[];
  caption?: string;
  title: string;
  description: string;
  fallbackThumbnail?: string | null;
  label?: string;
};

export function FeaturesBanner({
  imageUrl,
  images = [],
  videos = [],
  caption,
  title,
  description,
  fallbackThumbnail,
  label = "Overview",
}: FeaturesBannerProps) {
  const mediaItems = useMemo<SHeroMediaItem[]>(() => {
    const seen = new Set<string>();
    const items: SHeroMediaItem[] = [];

    const registerImage = (src: string | null | undefined, alt?: string) => {
      if (!src) return;
      const key = src.trim();
      if (!key || seen.has(key)) return;
      seen.add(key);
      items.push({
        type: "image",
        src: key,
        alt,
        title: alt,
      });
    };

    const registerVideo = (src: string | null | undefined, title?: string, thumbnail?: string | null) => {
      if (!src) return;
      const key = src.trim();
      if (!key || seen.has(key)) return;
      const usableThumbnail = deriveVideoThumbnail(key) ?? thumbnail ?? fallbackThumbnail ?? imageUrl ?? images[0]?.src ?? null;
      if (!usableThumbnail) {
        // Unable to provide a thumbnail that HeroMedia can render, so skip this entry.
        return;
      }
      seen.add(key);
      items.push({
        type: "video",
        src: key,
        title,
        thumbnail: usableThumbnail,
      });
    };

    registerImage(imageUrl, title);
    images.forEach((shot) => registerImage(shot.src, shot.alt));

    videos.forEach((videoUrl, index) => {
      registerVideo(
        videoUrl,
        `${title || "Product"} video ${index + 1}`,
        fallbackThumbnail,
      );
    });

    return items;
  }, [fallbackThumbnail, imageUrl, images, title, videos]);

  const hasMedia = mediaItems.length > 0;

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        {title ? (
          <h2 className="text-[20px] font-semibold leading-tight text-[#0a2540] sm:text-[22px]">{title}</h2>
        ) : null}
        <p className="max-w-3xl text-[16px] leading-[1.6] text-[#334155]">{description}</p>
      </div>

      {hasMedia ? <HeroMedia items={mediaItems} className="w-full" /> : null}
    </section>
  );
}

function deriveVideoThumbnail(videoUrl: string): string | null {
  try {
    const url = new URL(videoUrl);
    if (url.hostname.includes("youtube.com")) {
      const id = url.searchParams.get("v");
      if (id) {
        return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
      }
    }
    if (url.hostname === "youtu.be") {
      const id = url.pathname.replace("/", "");
      if (id) {
        return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
      }
    }
  } catch {
    return null;
  }

  return null;
}
=======
import Image from "next/image";

type FeaturesBannerProps = {
  imageUrl?: string | null;
  caption: string;
  title: string;
  description: string;
};

export function FeaturesBanner({ imageUrl, caption, title, description }: FeaturesBannerProps) {
  return (
    <section className="space-y-8">
      <div className="space-y-4">
        <p className="max-w-3xl text-[14px] leading-[1.6] text-[#334155]">{description}</p>
      </div>

      {imageUrl ? (
        <figure className="overflow-hidden rounded-[8px] border border-[#e6e8eb] bg-[#0a2540]">
          <div className="relative aspect-[16/9] w-full">
            <Image
              src={imageUrl}
              alt={caption}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 800px"
              priority
            />
          </div>
          <figcaption className="border-t border-[#e6e8eb] px-4 py-4 text-[14px] font-normal text-[#425466] sm:px-6">
            {caption}
          </figcaption>
        </figure>
      ) : null}
    </section>
  );
}
>>>>>>> origin/staging
