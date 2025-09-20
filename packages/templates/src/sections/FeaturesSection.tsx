"use client";

import { CheckCircle } from "lucide-react";

export type FeatureItem = {
  title: string;
  description?: string;
};

export type FeaturesSectionProps = {
  features: FeatureItem[];
};

export function FeaturesSection({ features }: FeaturesSectionProps) {
  return (
    <section className="container py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl  p-6  md:p-10">
          <div className="mb-8  pb-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Features</h2>
          </div>
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {features.map((feature, index) => (
              <li key={`feature-${index}`} className="flex flex-col items-start gap-2">
                <span className="flex items-center gap-1 text-sm font-medium leading-6 md:text-base">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full text-primary ">
                    <CheckCircle className="h-3.5 w-3.5" />
                  </span>
                  {feature.title}
                </span>
                {feature.description ? (
                  <span className="pl-10 text-xs text-muted-foreground leading-6">{feature.description}</span>
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
