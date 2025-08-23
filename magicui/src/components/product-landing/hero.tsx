'use client';

import { Product } from '../../../../schema';
import { Button } from '@/components/ui/button';
import { ArrowRight, Github, Chrome, Play } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface ProductHeroProps {
  product: Product;
  onPurchase?: () => void;
}

export default function ProductHero({ product, onPurchase }: ProductHeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-accent/5 py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
          <div className="flex flex-col justify-center space-y-8">
            {product.status === 'coming_soon' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 w-fit">
                Coming Soon
              </span>
            )}
            
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                {product.name}
              </h1>
              <p className="text-xl text-muted-foreground md:text-2xl">
                {product.tagline}
              </p>
            </div>

            <p className="text-lg text-muted-foreground max-w-[600px]">
              {product.description}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              {product.status === 'live' && (
                <Button 
                  size="lg" 
                  onClick={onPurchase}
                  className="group"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              )}
              
              {product.github_repo_url && (
                <Button 
                  size="lg" 
                  variant="outline"
                  asChild
                >
                  <Link href={product.github_repo_url} target="_blank">
                    <Github className="mr-2 h-4 w-4" />
                    View on GitHub
                  </Link>
                </Button>
              )}

              {product.chrome_web_store_url && (
                <Button 
                  size="lg" 
                  variant="outline"
                  asChild
                >
                  <Link href={product.chrome_web_store_url} target="_blank">
                    <Chrome className="mr-2 h-4 w-4" />
                    Chrome Store
                  </Link>
                </Button>
              )}
            </div>

            {product.technologies && product.technologies.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.technologies.map((tech, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1 text-sm rounded-full bg-secondary text-secondary-foreground"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            {product.featured_image_gif ? (
              <div className="relative aspect-video rounded-lg overflow-hidden shadow-2xl">
                <Image
                  src={product.featured_image_gif}
                  alt={product.name}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            ) : product.featured_image ? (
              <div className="relative aspect-video rounded-lg overflow-hidden shadow-2xl">
                <Image
                  src={product.featured_image}
                  alt={product.name}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            ) : product.product_video && product.product_video.length > 0 ? (
              <div className="relative aspect-video rounded-lg overflow-hidden shadow-2xl bg-accent/10">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="gap-2"
                    asChild
                  >
                    <Link href={product.product_video[0]} target="_blank">
                      <Play className="h-5 w-5" />
                      Watch Demo
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative aspect-video rounded-lg overflow-hidden shadow-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <div className="text-6xl font-bold text-primary/30">
                  {product.name.charAt(0)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}