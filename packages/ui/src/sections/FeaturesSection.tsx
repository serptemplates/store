"use client";

import { CheckCircle } from "lucide-react";
import { TypographyH2, TypographyP } from "@repo/ui";

export type FeatureItem = {
  title: string;
  description?: string;
};

export type FeaturesSectionProps = {
  features: FeatureItem[];
};

export function FeaturesSection({ features }: FeaturesSectionProps) {
  return (
    <section className="container py-14 sm:py-18">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl p-6 md:p-10">
          <div className="mb-8 text-center">
            <TypographyH2 className="md:text-4xl">
              Features
            </TypographyH2>
          </div>
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {features.map((feature, index) => (
              <li key={`feature-${index}`} className="flex flex-col items-start gap-2">
                <span className="flex items-center gap-2 text-base font-medium text-gray-700 leading-relaxed">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full text-primary">
                    <CheckCircle className="h-3.5 w-3.5" />
                  </span>
                  {feature.title}
                </span>
                {feature.description ? (
                  <TypographyP className="pl-9">
                    {feature.description}
                  </TypographyP>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default FeaturesSection;
