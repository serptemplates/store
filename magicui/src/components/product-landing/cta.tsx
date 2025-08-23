'use client';

import { Product } from '../../../../schema';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface ProductCTAProps {
  product: Product;
  onPurchase?: () => void;
}

export default function ProductCTA({ product, onPurchase }: ProductCTAProps) {
  return (
    <section className="py-20 md:py-32 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-full mb-6">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to transform your workflow?
          </h2>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of users who are already using {product.name} to boost their productivity
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {product.status === 'live' ? (
              <>
                <Button 
                  size="lg" 
                  onClick={onPurchase}
                  className="group"
                >
                  Get Started Now
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
                
                {product.github_repo_url && (
                  <Button 
                    size="lg" 
                    variant="outline"
                    asChild
                  >
                    <Link href={product.github_repo_url} target="_blank">
                      View Source Code
                    </Link>
                  </Button>
                )}
              </>
            ) : product.status === 'coming_soon' ? (
              <div className="inline-flex items-center px-6 py-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                <Sparkles className="mr-2 h-5 w-5" />
                Coming Soon - Get Notified
              </div>
            ) : null}
          </div>

          {product.version_number && (
            <p className="mt-8 text-sm text-muted-foreground">
              Current Version: v{product.version_number.toFixed(1)}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}