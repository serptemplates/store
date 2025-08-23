import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Play } from 'lucide-react';
import { Product } from '@/lib/schema';

interface HeroProps {
  product: Product;
  getVideoEmbed: (url: string) => string;
}

export function Hero({ product, getVideoEmbed }: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-24 md:py-32 border-b">
      {/* Abstract Background Shapes */}
      <div className="absolute -left-16 -top-16 h-64 w-64 animate-pulse rounded-full bg-primary/10 opacity-30 blur-3xl filter"></div>
      <div className="absolute -bottom-16 -right-16 h-72 w-72 animate-pulse rounded-lg bg-secondary/10 opacity-20 blur-3xl filter [animation-delay:0.5s]"></div>
      <div className="absolute bottom-1/4 left-1/3 h-40 w-40 animate-pulse rounded-full bg-primary/5 opacity-40 blur-2xl filter [animation-delay:1s]"></div>

      <div className="container relative z-10 max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h1 className="mb-6 text-pretty text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              {product.name}
            </h1>

            <p className="mb-8 max-w-2xl text-muted-foreground">
              {product.description}
            </p>

            <div className="flex flex-col gap-4 sm:flex-row mb-8">
              <Button size="lg" className="group w-full sm:w-auto">
                Get Started
                <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>

            {product.technologies && (
              <div className="flex flex-wrap gap-2">
                {product.technologies.map((tech) => (
                  <Badge key={tech} variant="secondary">
                    {tech}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            {product.product_video && product.product_video.length > 0 ? (
              <div className="aspect-video rounded-lg overflow-hidden bg-black shadow-2xl">
                <iframe
                  src={getVideoEmbed(product.product_video[0])}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : product.featured_image ? (
              <img 
                src={product.featured_image}
                alt={product.name}
                className="rounded-lg shadow-2xl w-full"
              />
            ) : (
              <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                <Play className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}