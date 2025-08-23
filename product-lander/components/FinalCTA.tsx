import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Product } from '@/lib/schema';

interface FinalCTAProps {
  product: Product;
}

export function FinalCTA({ product }: FinalCTAProps) {
  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="absolute inset-0 bg-primary/5"></div>
      <div className="absolute -left-24 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"></div>
      <div className="absolute -right-24 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"></div>
      
      <div className="relative mx-auto max-w-4xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
          Ready to start downloading?
        </h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Join thousands of users who are already using {product.name} for seamless content downloads
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="group">
            Get it Now
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </section>
  );
}