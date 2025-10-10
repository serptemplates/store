"use client";

import { useMemo, useRef } from "react";
import HeroMedia, { type HeroMediaHandle } from "./hero-media";
import { Button } from "@repo/ui";
import { getYoutubeThumbnail, useHeroTitle } from "../utils";
import type { HeroMediaProps } from "./hero-media";
import SmartLink from "./smart-link";

export type HeroLink = {
  label: string;
  url?: string;
  icon?: React.ReactNode;
  variant?: "outline" | "default";
  onClick?: () => void;
  openMediaIndex?: number;
};

type HeroProps = {
  title: string;
  description?: string;
  highlight?: string;
  links?: HeroLink[];
  media?: HeroMediaProps["items"];
};

const Hero = ({ title, description, highlight, links, media }: HeroProps) => {
  const mediaRef = useRef<HeroMediaHandle>(null);

  const processedMedia = useMemo(() => {
    if (!media) return undefined;
    return media.map((item) => {
      if (item.type === "video") {
        return {
          ...item,
          thumbnail: getYoutubeThumbnail(item.src) || item.thumbnail,
        };
      }
      return item;
    });
  }, [media]);

  const resolvedLinks = useMemo(() => {
    if (!links) return undefined;
    return links.map((link) => {
      if (link.onClick) {
        return link;
      }

      if (typeof link.openMediaIndex === "number") {
        return {
          ...link,
          onClick: () => {
            const targetIndex =
              link.openMediaIndex !== undefined ? link.openMediaIndex : 0;
            mediaRef.current?.open(targetIndex);
          },
        };
      }

      return link;
    });
  }, [links]);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100">
      <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]" />
      <div className="container relative py-16 md:py-24 lg:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center gap-12">
            <div className="flex flex-col items-center gap-6">
              <Title title={title} highlight={highlight} />
              {description && description.trim().length > 0 && (
                <p className="text-base text-balance text-center font-medium leading-relaxed text-gray-700 md:text-xl md:max-w-3xl">
                  {description}
                </p>
              )}
            </div>
            {resolvedLinks && resolvedLinks.length > 0 && (
              <div className="flex flex-col gap-5 sm:justify-center sm:flex-row">
                {resolvedLinks.map((link, index) => (
                  <LinkItem key={index} link={link} />
                ))}
              </div>
            )}
          </div>
          {processedMedia && processedMedia.length > 0 && (
            <HeroMedia ref={mediaRef} items={processedMedia} className="mt-16" />
          )}
        </div>
      </div>
    </section>
  );
};

type TitleProps = {
  title: string;
  highlight?: string;
};

const Title = ({ title, highlight }: TitleProps) => {
  const [beforeTitle, highlightedTitle, afterTitle] = useHeroTitle(
    title,
    highlight
  );

  return (
    <h1 className="text-center text-gray-900 font-black leading-tight -tracking-[2px] text-4xl md:text-5xl lg:text-6xl">
      {beforeTitle ? `${beforeTitle} ` : ""}
      <span className="relative inline whitespace-normal shadow-[inset_0_-0.25em_0_0] shadow-indigo-300">
        {highlightedTitle}
      </span>
      {afterTitle ? ` ${afterTitle}` : ""}
    </h1>
  );
};

const LinkItem = ({ link }: { link: HeroLink }) => {
  if (link.onClick) {
    return (
      <Button
        variant={link.variant || "default"}
        size="lg"
        className="font-bold"
        type="button"
        onClick={link.onClick}
      >
        {link.icon}
        {link.label}
      </Button>
    );
  }

  if (!link.url) {
    return null;
  }

  return (
    <Button
      variant={link.variant || "default"}
      size="lg"
      className="font-bold"
      asChild
    >
      <SmartLink href={link.url}>
        {link.icon}
        {link.label}
      </SmartLink>
    </Button>
  );
};

export default Hero;
