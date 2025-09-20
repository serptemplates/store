import React from "react";
import { cn } from "../lib/utils";

type Video = {
  src: string; // e.g., https://www.youtube.com/embed/ID or any embeddable URL
  title?: string;
  allow?: string; // optional allow attributes
};

export type VideoGridTwoProps = {
  left?: Video;
  right?: Video;
  className?: string;
  heading?: string;
  subheading?: string;
};

export function VideoGridTwo({ left, right, className, heading, subheading }: VideoGridTwoProps) {
  const items = [left, right].filter(Boolean) as Video[];
  return (
    <section className={cn("w-full", className)}>
      {(heading || subheading) && (
        <div className="mx-auto max-w-3xl text-center">
          {heading && <h2 className="mb-2 text-3xl font-bold md:text-4xl">{heading}</h2>}
          {subheading && <p className="text-muted-foreground">{subheading}</p>}
        </div>
      )}
      {items.length === 1 ? (
        <div className="mx-auto max-w-4xl">
          <ResponsiveEmbed src={items[0].src} title={items[0].title} allow={items[0].allow} />
        </div>
      ) : (
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          <ResponsiveEmbed src={items[0]?.src} title={items[0]?.title} allow={items[0]?.allow} />
          <ResponsiveEmbed src={items[1]?.src} title={items[1]?.title} allow={items[1]?.allow} />
        </div>
      )}
    </section>
  );
}

function ResponsiveEmbed({ src, title, allow }: { src: string; title?: string; allow?: string }) {
  return (
    <div className="relative w-full overflow-hidden rounded-lg border bg-muted/20 pt-[56.25%] shadow-sm">
      <iframe
        className="absolute inset-0 h-full w-full"
        src={src}
        title={title ?? "Video"}
        frameBorder="0"
        allow={allow ?? "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"}
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

export default VideoGridTwo;
