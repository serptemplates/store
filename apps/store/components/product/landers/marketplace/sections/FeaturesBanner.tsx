"use client";

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
          <figcaption className="border-t border-[#e6e8eb] px-4 py-4 text-[14px] font-normal text-[#f1f5f9] sm:px-6">
            {caption}
          </figcaption>
        </figure>
      ) : null}
    </section>
  );
}
