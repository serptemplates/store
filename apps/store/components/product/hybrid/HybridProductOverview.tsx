import type { ProductInfoSectionProps } from "@/components/product/ProductInfoSection";
import { ProductBreadcrumb, type ProductBreadcrumbItem } from "@/components/product/ProductBreadcrumb";
import { ProductMediaGallery } from "@/components/product/ProductMediaGallery";
import { ProductInfoSection } from "@/components/product/ProductInfoSection";

export interface HybridProductOverviewProps {
  breadcrumbItems: ProductBreadcrumbItem[];
  productName: string;
  images: string[];
  selectedImageIndex: number;
  onSelectImage: (index: number) => void;
  brandLogoPath?: string | null;
  infoProps: ProductInfoSectionProps;
}

export function HybridProductOverview({
  breadcrumbItems,
  productName,
  images,
  selectedImageIndex,
  onSelectImage,
  brandLogoPath,
  infoProps,
}: HybridProductOverviewProps) {
  return (
    <div className="space-y-10">
      <ProductBreadcrumb items={breadcrumbItems} />

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10 xl:gap-16">
        <ProductMediaGallery
          images={images}
          selectedIndex={selectedImageIndex}
          onSelect={onSelectImage}
          productName={productName}
          brandLogoPath={brandLogoPath}
        />

        <ProductInfoSection {...infoProps} />
      </div>
    </div>
  );
}
