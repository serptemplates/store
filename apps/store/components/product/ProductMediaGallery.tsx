"use client";

import Image from "next/image";

export interface ProductMediaGalleryProps {
  images: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  productName: string;
  brandLogoPath?: string | null;
}

export function ProductMediaGallery({ images, selectedIndex, onSelect, productName, brandLogoPath }: ProductMediaGalleryProps) {
  const selectedImage = images[selectedIndex] ?? images[0];
  const isAnimated = (source?: string) => Boolean(source && /\.gif($|\?)/i.test(source));
  const isLocalAsset = (source?: string) => Boolean(source && source.startsWith("/"));

  return (
    <div>
      <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 mb-4">
        {selectedImage ? (
          <Image
            src={selectedImage}
            alt={productName}
            fill
            className={brandLogoPath && selectedIndex === 0 ? "object-contain p-8" : "object-cover"}
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
            quality={90}
            unoptimized={isAnimated(selectedImage) || isLocalAsset(selectedImage)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No image available
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => onSelect(index)}
              className={`relative aspect-square rounded-md overflow-hidden border transition ${
                selectedIndex === index ? "border-blue-500" : "border-transparent hover:border-blue-300"
              }`}
            >
              <Image
                src={image}
                alt={`${productName} screenshot ${index + 1}`}
                fill
                className="object-cover"
                sizes="150px"
                quality={75}
                unoptimized={isAnimated(image) || isLocalAsset(image)}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
