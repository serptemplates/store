"use client";

import * as React from "react";
import { cn } from "./lib/utils";

export type MarqueeProps = React.HTMLAttributes<HTMLDivElement> & {
  reverse?: boolean;
  pauseOnHover?: boolean;
  vertical?: boolean;
};

export function Marquee({ className, children, reverse = false, pauseOnHover = false, vertical = false, ...props }: MarqueeProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const hoverRef = React.useRef(false);

  React.useEffect(() => {
    const el = containerRef.current;
    const track = trackRef.current;
    if (!el || !track) return;

    // Duplicate content to make a seamless loop and ensure overflow
    if (track.childElementCount === 1) {
      track.appendChild(track.firstElementChild!.cloneNode(true));
    }
    const minWidth = el.clientWidth * 1.5; // target enough width to scroll visibly
    let safety = 0;
    const needs = () => (vertical ? track.scrollHeight < el.clientHeight * 1.5 : track.scrollWidth < minWidth);
    while (needs() && safety < 12) {
      track.appendChild(track.firstElementChild!.cloneNode(true));
      safety++;
    }

    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const paused = pauseOnHover && hoverRef.current;
      if (!paused) {
        // Recompute layout-derived values each frame so late-loading images
        // don’t freeze the marquee in some columns.
        const groups = track.childElementCount;
        const totalLen = vertical ? track.scrollHeight : track.scrollWidth;
        const viewport = vertical ? el.clientHeight : el.clientWidth;
        // Scroll length should exceed viewport; if a single group is shorter
        // than the viewport, allow looping across multiple groups by using
        // totalLen - viewport as the effective loop length.
        const groupLen = groups > 0 ? totalLen / groups : totalLen;
        const loopLen = Math.max(totalLen - viewport, groupLen);
        // Support CSS var --duration (e.g., 30s, 20000ms) to control speed
        const durStr = getComputedStyle(el).getPropertyValue("--duration").trim();
        let durationSec = 60;
        if (durStr) {
          const n = parseFloat(durStr);
          if (!Number.isNaN(n)) {
            durationSec = /ms$/i.test(durStr) ? n / 1000 : n; // default assume seconds
          }
        }
        const speed = durationSec > 0 && loopLen > 0 ? loopLen / durationSec : 60; // px/s fallback
        const dir = reverse ? -1 : 1;
        if (vertical) {
          el.scrollTop += dir * speed * dt;
          const max = loopLen || totalLen;
          if (!reverse && el.scrollTop >= max) el.scrollTop = 0;
          if (reverse && el.scrollTop <= 0) el.scrollTop = max;
        } else {
          el.scrollLeft += dir * speed * dt;
          const max = loopLen || totalLen;
          if (!reverse && el.scrollLeft >= max) el.scrollLeft = 0;
          if (reverse && el.scrollLeft <= 0) el.scrollLeft = max;
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reverse, pauseOnHover, vertical]);

  return (
    <div
      ref={containerRef}
      className={cn("no-scrollbar", vertical ? "overflow-y-hidden" : "overflow-x-hidden", className)}
      onMouseEnter={() => (hoverRef.current = true)}
      onMouseLeave={() => (hoverRef.current = false)}
      {...props}
    >
      <div ref={trackRef} className={cn("flex items-stretch gap-6", vertical ? "flex-col" : "flex-row") }>
        <div className={cn("flex items-stretch gap-6", vertical ? "flex-col" : "flex-row")}>{children}</div>
      </div>
    </div>
  );
}

export default Marquee;
