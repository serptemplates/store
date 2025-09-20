"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export type HeroVideoDialogProps = {
  className?: string;
  animationStyle?: "from-center" | "fade";
  videoSrc: string;
  thumbnailSrc?: string;
  thumbnailAlt?: string;
};

export default function HeroVideoDialog({
  className,
  animationStyle = "from-center",
  videoSrc,
  thumbnailSrc,
  thumbnailAlt = "Loom Video Downloader",
}: HeroVideoDialogProps) {
  const [open, setOpen] = React.useState(false);

  // Normalize common video URLs (e.g., YouTube watch URLs) to embeddable URLs
  const embedSrc = React.useMemo(() => {
    try {
      const url = new URL(videoSrc);

      // Handle YouTube watch URLs and short links
      const isYouTube = /(^|\.)youtube\.com$/.test(url.hostname) || /(^|\.)youtube-nocookie\.com$/.test(url.hostname);
      const isYoutuBe = /(^|\.)youtu\.be$/.test(url.hostname);

      if (isYouTube || isYoutuBe) {
        let id = "";

        // https://youtu.be/<id>
        if (isYoutuBe) {
          id = url.pathname.replace(/^\//, "");
        }

        // https://www.youtube.com/watch?v=<id>
        if (isYouTube) {
          if (url.pathname === "/watch") {
            id = url.searchParams.get("v") || id;
          } else if (url.pathname.startsWith("/live/")) {
            id = url.pathname.split("/")[2] || id;
          } else if (url.pathname.startsWith("/embed/")) {
            // already an embed URL
            return videoSrc;
          }
        }

        if (id) {
          const params = new URLSearchParams({ rel: "0", modestbranding: "1" });
          return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
        }
      }

      // Default: return provided src
      return videoSrc;
    } catch {
      return videoSrc;
    }
  }, [videoSrc]);

  // Derive a default thumbnail for YouTube links if none provided
  const youTubeId = React.useMemo(() => {
    try {
      const url = new URL(videoSrc);
      const isYouTube = /(^|\.)youtube\.com$/.test(url.hostname) || /(^|\.)youtube-nocookie\.com$/.test(url.hostname);
      const isYoutuBe = /(^|\.)youtu\.be$/.test(url.hostname);
      if (!(isYouTube || isYoutuBe)) return undefined;

      if (isYoutuBe) {
        return url.pathname.replace(/^\//, "");
      }

      if (isYouTube) {
        if (url.pathname === "/watch") return url.searchParams.get("v") || undefined;
        if (url.pathname.startsWith("/live/")) return url.pathname.split("/")[2] || undefined;
        if (url.pathname.startsWith("/embed/")) return url.pathname.split("/")[2] || undefined;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }, [videoSrc]);

  const computedDefaultThumb = youTubeId
    ? `https://img.youtube.com/vi/${youTubeId}/maxresdefault.jpg`
    : undefined;

  const [thumbSrc, setThumbSrc] = React.useState<string | undefined>(
    thumbnailSrc ?? computedDefaultThumb,
  );

  React.useEffect(() => {
    setThumbSrc(thumbnailSrc ?? computedDefaultThumb);
  }, [thumbnailSrc, computedDefaultThumb]);

  const effectiveThumbnailSrc = thumbSrc;
  const [thumbLoaded, setThumbLoaded] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement | null>(null);

  React.useEffect(() => {
    setThumbLoaded(false);
  }, [effectiveThumbnailSrc]);

  const handleThumbError = React.useCallback(() => {
    if (computedDefaultThumb && thumbSrc !== computedDefaultThumb) {
      // Fall back to the resolved platform thumbnail (e.g. YouTube) if the provided asset fails.
      setThumbSrc(computedDefaultThumb);
      return;
    }

    if (!thumbSrc) return;

    if (thumbSrc.includes("maxresdefault")) {
      setThumbSrc(thumbSrc.replace("maxresdefault", "hqdefault"));
    } else if (thumbSrc.includes("hqdefault")) {
      setThumbSrc(thumbSrc.replace("hqdefault", "mqdefault"));
    } else {
      setThumbSrc(undefined);
    }
  }, [thumbSrc, computedDefaultThumb]);

  React.useEffect(() => {
    const img = imgRef.current;
    if (!img || !img.complete) {
      return;
    }

    if (img.naturalWidth > 0) {
      setThumbLoaded(true);
      return;
    }

    // When the image fails before hydration, the error event has already fired, so
    // React's onError callback never runs. Detect that situation and trigger the
    // same fallback logic manually.
    handleThumbError();
  }, [effectiveThumbnailSrc, handleThumbError]);

  const anim =
    animationStyle === "from-center"
      ? "data-[open=false]:scale-95 data-[open=false]:opacity-0 data-[open=true]:scale-100 data-[open=true]:opacity-100"
      : "data-[open=false]:opacity-0 data-[open=true]:opacity-100";

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        aria-label="Play video"
        onClick={() => setOpen(true)}
        className={cn(
          "group relative block w-full overflow-hidden rounded-2xl border bg-muted/40",
          effectiveThumbnailSrc ? "aspect-video" : "p-10",
        )}
      >
        {effectiveThumbnailSrc ? (
          <>
            {!thumbLoaded && (
              <div className="absolute inset-0 animate-pulse bg-muted" />
            )}
            <img
              src={effectiveThumbnailSrc}
              alt={thumbnailAlt}
              className={cn(
                "h-full w-full object-cover transition-opacity duration-150",
                thumbLoaded ? "opacity-100" : "opacity-0",
              )}
              ref={imgRef}
              loading="eager"
              referrerPolicy="no-referrer"
              onLoad={() => setThumbLoaded(true)}
              onError={handleThumbError}
            />
          </>
        ) : (
          <div className="flex aspect-video h-full w-full items-center justify-center text-muted-foreground" />
        )}
        {/* Play button overlay */}
        <span className="absolute inset-0 grid place-items-center bg-black/0 transition-colors ">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-black shadow-md ring-1 ring-black/10">
            <svg width="36" height="36" viewBox="0 0 24 24"fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
      </button>

      {/* Dialog */}
      {open && (
        <div
          role="dialog"
          aria-modal
          className="fixed inset-0 z-[100] grid place-items-center backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            data-open={open}
            className={cn(
              "relative w-full max-w-4xl rounded-2xl border bg-background  shadow-2xl transition-all duration-200",
              anim,
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close video"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/70"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div className="aspect-video w-full overflow-hidden rounded-xl">
              <iframe
                src={embedSrc}
                title={thumbnailAlt}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
