"use client";

import type { ComponentType } from "react";
import HeroVideoDialog from "@repo/ui/magic/HeroVideoDialog";
import TestimonialsCarousel from "@repo/ui/sections/TestimonialsCarousel";

type UI = {
  Navbar: ComponentType<any>;
  Footer: ComponentType<any>;
  Badge: ComponentType<any>;
  Button: ComponentType<any>;
};

export type MagicUiSaasTemplateProps = {
  ui: UI;
  platform: string;
  videoUrl?: string;
  exampleUrl?: string; // deprecated
  badgeText?: string;
  heroTitle?: string;
  heroDescription?: string;
  lightThumbnailSrc?: string;
  darkThumbnailSrc?: string;
  thumbnailAlt?: string;
};

export function MagicUiSaasTemplate({
  ui,
  platform,
  videoUrl,
  exampleUrl,
  badgeText = "",
  heroTitle = `${platform} Video Downloader`,
  heroDescription = `Download ${platform} videos, audio, and transcripts instantly.`,
  lightThumbnailSrc,
  darkThumbnailSrc,
  thumbnailAlt = "Hero Video",
}: MagicUiSaasTemplateProps) {
  const { Navbar, Footer } = ui;
  const resolvedVideoSrc = videoUrl ?? exampleUrl;

  return (
    <>
      <Navbar />
      <main>
        {/* Centered hero inspired by MagicUI lander */}
        <section id="hero" className="relative overflow-hidden">
          <div className="container flex w-full flex-col items-center justify-start px-4 pt-28 sm:px-6 sm:pt-28 md:pt-32 lg:px-8">
            {badgeText && (
              <div className="flex w-auto items-center space-x-2 rounded-full bg-primary/15 px-2 py-1 ring-1 ring-accent">
                <div className="w-fit rounded-full bg-accent px-2 py-0.5 text-center text-xs font-medium text-primary sm:text-sm">
                  📣 {platform}
                </div>
                <p className="text-xs font-medium text-primary sm:text-sm">
                  {badgeText}
                </p>
              </div>
            )}

            <h1 className="mt-8 text-center text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl">
              {heroTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-center text-lg leading-7 text-muted-foreground sm:text-xl sm:leading-8">
              {heroDescription}
            </p>

            <div className="relative mx-auto mt-10 w-full max-w-3xl">
              <div className="relative">
                {resolvedVideoSrc ? (
                  <>
                    <HeroVideoDialog
                      className="block dark:hidden"
                      animationStyle="from-center"
                      videoSrc={resolvedVideoSrc}
                      thumbnailSrc={lightThumbnailSrc}
                      thumbnailAlt={thumbnailAlt}
                    />
                    <HeroVideoDialog
                      className="hidden dark:block"
                      animationStyle="from-center"
                      videoSrc={resolvedVideoSrc}
                      thumbnailSrc={darkThumbnailSrc ?? lightThumbnailSrc}
                      thumbnailAlt={thumbnailAlt}
                    />
                  </>
                ) : (
                  <div className="aspect-video w-full overflow-hidden rounded-2xl border bg-muted/40" />
                )}
              </div>
              <div className="pointer-events-none absolute inset-x-0 -bottom-8 h-1/3 bg-gradient-to-t from-background via-background to-transparent lg:h-1/4" />
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <TestimonialsCarousel />

        <Footer />
      </main>
    </>
  );
}

export default MagicUiSaasTemplate;
