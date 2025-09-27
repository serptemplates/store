"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../lib/utils";

export type Screenshot = {
  src: string;
  alt?: string;
  srcSet?: string;
};

export type ScreenshotsCarouselProps = {
  images: Screenshot[];
  className?: string;
  title?: string;
  itemMaxHeight?: number; // px (display height)
  itemWidth?: number; // px (display width)
  gap?: number; // px spacing between items
  bleed?: boolean; // full-bleed to viewport width
  autoplay?: boolean; // auto-scroll horizontally
  autoSpeed?: number; // pixels per second
  pauseOnHover?: boolean; // pause autoplay on hover
};

export function ScreenshotsCarousel({
  images,
  className,
  title = "",
  itemMaxHeight = 450,
  itemWidth = 600,
  gap = 8,
  bleed = true,
  autoplay = true,
  autoSpeed = 200,
  pauseOnHover = true,
}: ScreenshotsCarouselProps) {
  // Filter out invalid images
  const validImages = images.filter(img => img.src && img.src.trim() !== '');

  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const directionRef = useRef<1 | -1>(1);

  const updateScrollButtons = () => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  };

  useEffect(() => {
    const r = requestAnimationFrame(updateScrollButtons);
    return () => cancelAnimationFrame(r);
  }, []);

  // Autoplay scroll loop
  useEffect(() => {
    if (!autoplay) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const el = trackRef.current;
      if (!el) {
        raf = requestAnimationFrame(step);
        return;
      }
      const dt = Math.max(0, now - last) / 1000; // seconds
      last = now;
      const paused = pauseOnHover && isHovered;
      if (!paused) {
        const delta = autoSpeed * dt * directionRef.current;
        const prev = el.scrollLeft;
        el.scrollLeft = prev + delta;
        const atStart = el.scrollLeft <= 0;
        const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
        if (atEnd) directionRef.current = -1;
        if (atStart) directionRef.current = 1;
      }
      updateScrollButtons();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [autoplay, autoSpeed, pauseOnHover, isHovered]);

  const onPrev = () => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: -el.clientWidth, behavior: "smooth" });
  };

  const onNext = () => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: el.clientWidth, behavior: "smooth" });
  };

  const itemStyle = useMemo<React.CSSProperties>(
    () => ({ maxHeight: itemMaxHeight }),
    [itemMaxHeight]
  );

  const gapStyle = useMemo<React.CSSProperties>(() => ({ gap }), [gap]);

  const closeLightbox = useCallback(() => setSelectedIndex(null), []);

  const showPrev = useCallback(() => {
    setSelectedIndex((prev) => {
      if (prev === null) return prev;
      return (prev - 1 + validImages.length) % validImages.length;
    });
  }, [validImages.length]);

  const showNext = useCallback(() => {
    setSelectedIndex((prev) => {
      if (prev === null) return prev;
      return (prev + 1) % validImages.length;
    });
  }, [validImages.length]);

  useEffect(() => {
    if (selectedIndex === null) {
      return;
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPrev();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        showNext();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedIndex, closeLightbox, showPrev, showNext]);

  // Don't render anything if no valid images
  if (validImages.length === 0) {
    return null;
  }

  return (
    <section className={cn("w-full", className)}>
      {title && (
        <h2 className="mb-16 text-2xl font-semibold leading-tight tracking-tight">
          {title}
        </h2>
      )}
      <div className={cn("relative", bleed && "mx-[calc(50%-50vw)] w-screen")}> 
        {/* Left gradient fade */}
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-background to-transparent" />
        {/* Right gradient fade */}
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-background to-transparent" />


        {/* Track */}
        <div
          ref={trackRef}
          className="no-scrollbar relative overflow-x-auto scroll-smooth"
          onScroll={updateScrollButtons}
          onMouseEnter={pauseOnHover ? () => setIsHovered(true) : undefined}
          onMouseLeave={pauseOnHover ? () => setIsHovered(false) : undefined}
        >
          <div className="flex items-stretch px-4" style={gapStyle}>
            {validImages.map((img, i) => (
              <div
                key={i}
                className="image flex shrink-0 items-center justify-center"
                style={{ width: itemWidth }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedIndex(i)}
                  className="group block h-full w-full overflow-hidden rounded-md border bg-muted shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <img
                    src={img.src}
                    srcSet={img.srcSet}
                    alt={img.alt ?? `Screenshot ${i + 1}`}
                    className="h-auto w-full object-contain transition duration-200 group-hover:scale-[1.02]"
                    style={itemStyle}
                    loading={i === 0 ? "eager" : "lazy"}
                    onLoad={updateScrollButtons}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedIndex !== null && validImages[selectedIndex] && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 sm:p-10"
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
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white shadow hover:bg-black/80"
            >
              <span className="sr-only">Close</span>
              ×
            </button>

            {validImages.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous screenshot"
                  onClick={showPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-white/80 transition hover:text-white sm:left-4"
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Next screenshot"
                  onClick={showNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/80 transition hover:text-white sm:right-4"
                >
                  ›
                </button>
              </>
            )}

            <img
              src={validImages[selectedIndex].src}
              srcSet={validImages[selectedIndex].srcSet}
              alt={validImages[selectedIndex].alt ?? `Screenshot ${selectedIndex + 1}`}
              className="max-h-[90vh] w-full object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
}

export default ScreenshotsCarousel;
