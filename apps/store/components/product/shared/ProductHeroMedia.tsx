import Image from "next/image";
import { cn } from "@repo/ui/lib/utils";

type ProductHeroMediaProps = {
  imageUrl?: string | null;
  caption?: string;
  className?: string;
};

export function ProductHeroMedia({ imageUrl, caption, className }: ProductHeroMediaProps) {
  if (!imageUrl) {
    return null;
  }

  return (
    <figure className={cn("overflow-hidden rounded-[8px] border border-[#e6e8eb] bg-[#0a2540]", className)}>
      <div className="relative aspect-[16/9] w-full">
        <Image
          src={imageUrl}
          alt={caption ?? "Product screenshot"}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 800px"
          priority
        />
      </div>
      {caption ? (
        <figcaption className="border-t border-[#e6e8eb] px-4 py-4 text-[14px] font-normal text-[#f1f5f9] sm:px-6">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
