'use client';

import { Product } from '../../../../schema';
import { BookOpen, ChevronRight } from 'lucide-react';

interface ProductUsageProps {
  product: Product;
}

export default function ProductUsage({ product }: ProductUsageProps) {
  if (!product.usage_instructions || product.usage_instructions.length === 0) return null;

  return (
    <section className="py-20 md:py-32 bg-secondary/5">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-full mb-4">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How to Use {product.name}
            </h2>
            <p className="text-lg text-muted-foreground">
              Step-by-step guide to get the most out of your purchase
            </p>
          </div>

          <div className="space-y-4">
            {product.usage_instructions.map((instruction, index) => (
              <div 
                key={index}
                className="group bg-card rounded-lg p-6 border border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-base leading-relaxed">{instruction}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
                </div>
              </div>
            ))}
          </div>

          {product.troubleshooting_instructions && product.troubleshooting_instructions.length > 0 && (
            <div className="mt-12 p-6 rounded-lg border border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/30">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
                Troubleshooting Tips
              </h3>
              <ul className="space-y-2">
                {product.troubleshooting_instructions.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-yellow-600 dark:text-yellow-400 mt-1">•</span>
                    <span className="text-sm">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}