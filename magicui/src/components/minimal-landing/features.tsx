'use client';

import { Product } from '../../../../schema';

interface MinimalFeaturesProps {
  product: Product;
}

export default function MinimalFeatures({ product }: MinimalFeaturesProps) {
  if (!product.features || product.features.length === 0) return null;

  return (
    <section className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-bold tracking-tight text-center mb-12 text-gray-900 dark:text-white">
          Everything you need
        </h2>
        
        <div className="space-y-4">
          {product.features.map((feature, index) => (
            <div key={index} className="flex gap-3">
              <svg className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-gray-600 dark:text-gray-400">{feature}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}