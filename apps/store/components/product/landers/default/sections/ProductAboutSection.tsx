import { TypographyH2, TypographyP } from "@repo/ui";

type ProductAboutSectionProps = {
  title: string;
  paragraphs: string[];
};

export function ProductAboutSection({ title, paragraphs }: ProductAboutSectionProps) {
  if (!paragraphs.length) {
    return null;
  }

  return (
    <section className="bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-14 sm:py-18">
        <TypographyH2 className="text-center">
          {title}
        </TypographyH2>
        <div className="mt-6 space-y-5">
          {paragraphs.map((paragraph, index) => (
            <TypographyP key={index}>
              {paragraph}
            </TypographyP>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ProductAboutSection;
