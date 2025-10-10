'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import {
  ProductSearchBar,
  type ProductCategory,
  type CategorySelection,
} from '@/components/ProductSearchBar';

import type { VideoListingItem } from './types';

interface VideoLibraryShellProps {
  videos: VideoListingItem[];
}

function toCategoryId(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export default function VideoLibraryShell({ videos }: VideoLibraryShellProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categorySelection, setCategorySelection] = useState<CategorySelection>({
    mode: 'all',
    excluded: [],
  });

  const categories: ProductCategory[] = useMemo(() => {
    const counts = new Map<string, number>();
    videos.forEach((video) => {
      counts.set(video.productName, (counts.get(video.productName) ?? 0) + 1);
    });

    const sorted = Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({
        id: toCategoryId(name),
        name,
        count,
      }));

    return [
      { id: 'all', name: 'All Videos', count: videos.length },
      ...sorted,
    ];
  }, [videos]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredVideos = useMemo(() => {
    const excluded =
      categorySelection.mode === 'all'
        ? new Set(categorySelection.excluded)
        : null;
    const included =
      categorySelection.mode === 'custom'
        ? new Set(categorySelection.included)
        : null;

    return videos.filter((video) => {
      const categoryId = video.productName ? toCategoryId(video.productName) : null;

      if (categorySelection.mode === 'all') {
        if (categoryId && excluded?.has(categoryId)) {
          return false;
        }
      } else {
        if ((included?.size ?? 0) === 0) {
          return false;
        }
        if (!categoryId || !included?.has(categoryId)) {
          return false;
        }
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [video.title, video.description, video.productName]
        .filter(Boolean)
        .map((value) => value.toLowerCase());

      return haystack.some((value) => value.includes(normalizedQuery));
    });
  }, [videos, categorySelection, normalizedQuery]);

  const visibleVideos = filteredVideos;
  return (
    <div className="bg-muted/20 py-12">
      <div className="container space-y-10">
        <header className="mx-auto max-w-3xl space-y-4 text-center">
 
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Videos
          </h1>

        </header>

        <ProductSearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          categories={categories}
          categorySelection={categorySelection}
          setCategorySelection={setCategorySelection}
        />

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleVideos.map((item) => (
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
                  </>
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-muted text-xs text-muted-foreground">
                    Preview coming soon
                  </div>
                )}
              </Link>
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-medium leading-snug text-foreground">
                  <Link href={item.watchPath} className="hover:text-primary">
                    {item.title}
                  </Link>
                </h3>
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
