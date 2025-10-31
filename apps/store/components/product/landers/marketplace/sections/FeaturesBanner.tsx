"use client";

import { ProductHeroMedia } from "@/components/product/shared/ProductHeroMedia";

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

      <ProductHeroMedia imageUrl={imageUrl} caption={caption} />
    </section>
  );
}
