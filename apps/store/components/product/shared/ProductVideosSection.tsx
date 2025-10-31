"use client";

import Image from "next/image";

import type { ProductVideoEntry } from "@/lib/products/video";

type ProductVideosSectionProps = {
  videos: ProductVideoEntry[];
  heading?: string;
  ctaLabel?: string;
  moreLinkHref?: string;
};

export function ProductVideosSection({
  videos,
  heading = "Videos",
  ctaLabel = "More videos",
  moreLinkHref = "/videos",
}: ProductVideosSectionProps) {
  if (!Array.isArray(videos) || videos.length === 0) {
    return null;
  }

  return (
    <section className="bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-col gap-3 text-center">
          <span className="mx-auto inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-blue-700">
            Watch
          </span>
          <h2 className="text-3xl font-semibold text-gray-900">{heading}</h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {videos.map((video) => (
            <article
              key={video.watchPath}
              className="flex h-full flex-col overflow-hidden rounded-2xl bg-white transition-transform hover:-translate-y-1"
            >
              <a href={video.watchPath} className="relative block aspect-video overflow-hidden bg-gray-200">
                {video.thumbnailUrl ? (
                  <Image
                    src={video.thumbnailUrl}
                    alt={video.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    quality={85}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                    Video preview unavailable
                  </div>
                )}
              </a>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <h3 className="text-base font-medium text-gray-900">
                  <a href={video.watchPath} className="hover:text-blue-600">
                    {video.title}
                  </a>
                </h3>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <a
            href={moreLinkHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            {ctaLabel}
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
