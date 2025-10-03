'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import type { VideoListingItem } from './types';

interface VideoLibraryShellProps {
  siteName: string;
  filters: string[];
  videos: VideoListingItem[];
}

export default function VideoLibraryShell({
  siteName,
  filters,
  videos,
}: VideoLibraryShellProps) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('All');

  const normalizedQuery = query.trim().toLowerCase();

  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      const matchesFilter = activeFilter === 'All' || video.productName === activeFilter;
      if (!matchesFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [video.title, video.description, video.productName]
        .filter(Boolean)
        .map((value) => value.toLowerCase());

      return haystack.some((value) => value.includes(normalizedQuery));
    });
  }, [videos, activeFilter, normalizedQuery]);

  const [featuredVideo, ...remainingVideos] = filteredVideos;
  return (
    <div className="bg-muted/20 py-12">
      <div className="container space-y-10">
        <header className="mx-auto max-w-3xl space-y-4 text-center">
          <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            Video Library
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Explore every {siteName} walkthrough in one place
          </h1>
          <p className="text-base text-muted-foreground">
            Browse demos and related tutorials, filter by product, and jump straight into the optimized watch experience.
          </p>
        </header>

        <div className="mx-auto flex w-full flex-col gap-4">
          <form
            className="mx-auto flex w-full max-w-3xl items-center gap-2 rounded-full border border-border bg-background px-4 py-2 shadow-sm"
            role="search"
            onSubmit={(event) => event.preventDefault()}
          >
            <svg
              className="h-4 w-4 flex-shrink-0 text-muted-foreground"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M11 5C7.686 5 5 7.686 5 11C5 14.314 7.686 17 11 17C12.657 17 14.156 16.328 15.242 15.242C16.328 14.156 17 12.657 17 11C17 7.686 14.314 5 11 5ZM3 11C3 6.582 6.582 3 11 3C15.418 3 19 6.582 19 11C19 12.85 18.372 14.554 17.318 15.926L20.707 19.293L19.293 20.707L15.926 17.318C14.554 18.372 12.85 19 11 19C6.582 19 3 15.418 3 11Z"
                fill="currentColor"
              />
            </svg>
            <input
              type="search"
              placeholder="Search videos"
              className="w-full bg-transparent text-sm outline-none"
              aria-label="Search videos"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </form>

          <div className="flex flex-wrap justify-center gap-2">
            {['All', ...filters].map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  className={`inline-flex items-center rounded-full border px-5 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'border-transparent bg-foreground text-background'
                      : 'border-border bg-background text-foreground hover:border-foreground/40'
                  }`}
                  onClick={() => setActiveFilter(filter)}
                  aria-pressed={isActive}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>

        {featuredVideo && (
          <article className="mx-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-sm">
            <Link href={featuredVideo.watchPath} className="block">
              {featuredVideo.thumbnailUrl ? (
                <div className="relative aspect-video w-full bg-muted">
                  <Image
                    src={featuredVideo.thumbnailUrl}
                    alt={featuredVideo.title}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 1024px, 100vw"
                    priority
                    unoptimized
                  />
                  <span className="absolute bottom-3 right-3 rounded bg-black/70 px-2 py-1 text-xs font-semibold text-white">
                    Watch now
                  </span>
                </div>
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                  Preview coming soon
                </div>
              )}
            </Link>
            <div className="flex gap-3 px-6 pb-6 pt-5">
              <div className="mt-1 h-12 w-12 flex-shrink-0 rounded-full bg-primary/10 text-primary">
                <span className="flex h-full w-full items-center justify-center text-sm font-semibold">
                  {featuredVideo.productName.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <h2 className="text-xl font-semibold leading-tight text-foreground">
                  <Link href={featuredVideo.watchPath} className="hover:text-primary">
                    {featuredVideo.title}
                  </Link>
                </h2>
                <p className="text-sm text-muted-foreground">{featuredVideo.productName}</p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                  {siteName} • {featuredVideo.source === 'primary' ? 'Demo premiere' : 'Related walkthrough'}
                </p>
              </div>
            </div>
          </article>
        )}

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {(featuredVideo ? remainingVideos : filteredVideos).map((item) => (
            <article key={item.watchPath} className="flex flex-col gap-3">
              <Link href={item.watchPath} className="group relative block overflow-hidden rounded-2xl border border-border bg-muted">
                {item.thumbnailUrl ? (
                  <>
                    <div className="relative aspect-video w-full">
                      <Image
                        src={item.thumbnailUrl}
                        alt={item.title}
                        fill
                        className="object-cover transition duration-200 group-hover:scale-[1.02]"
                        sizes="(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw"
                        loading="lazy"
                        unoptimized
                      />
                    </div>
                    <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                      {item.source === 'primary' ? 'Demo' : 'Related'}
                    </span>
                  </>
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-muted text-xs text-muted-foreground">
                    Preview coming soon
                  </div>
                )}
              </Link>
              <div className="flex gap-3">
                <div className="mt-1 h-9 w-9 flex-shrink-0 rounded-full bg-primary/10 text-primary">
                  <span className="flex h-full w-full items-center justify-center text-xs font-semibold">
                    {item.productName.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <h3 className="text-sm font-semibold leading-snug text-foreground">
                    <Link href={item.watchPath} className="hover:text-primary">
                      {item.title}
                    </Link>
                  </h3>
                  <p className="text-xs text-muted-foreground">{item.productName}</p>
                  <p className="text-xs text-muted-foreground/80">{siteName} • {item.source === 'primary' ? 'Demo' : 'Related'}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {filteredVideos.length === 0 && (
          <div className="mx-auto w-full max-w-3xl rounded-3xl border border-dashed border-border bg-background p-10 text-center text-muted-foreground">
            No videos found. Try a different search or filter.
          </div>
        )}
      </div>
    </div>
  );
}
