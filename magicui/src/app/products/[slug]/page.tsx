'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { CheckoutButton } from '@/components/checkout-button';
import { Product } from '@/lib/ghl-api';
import { motion } from 'motion/react';
import { HeroSection } from '@/components/sections/hero-section';
import { BentoSection } from '@/components/sections/bento-section';
import { FeatureSection } from '@/components/sections/feature-section';
import { TestimonialSection } from '@/components/sections/testimonial-section';
import { FAQSection } from '@/components/sections/faq-section';
import { CTASection } from '@/components/sections/cta-section';
import { FooterSection } from '@/components/sections/footer-section';

export default function ProductLandingPage() {
  const params = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.slug) {
      fetchProductBySlug(params.slug as string);
    }
  }, [params.slug]);

  const fetchProductBySlug = async (slug: string) => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      const foundProduct = data.products?.find((p: Product) => p.slug === slug);
      setProduct(foundProduct || null);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-muted rounded mb-4"></div>
          <div className="h-4 w-48 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold mb-4">Product Not Found</h1>
        <Link href="/products">
          <Button>Back to Products</Button>
        </Link>
      </div>
    );
  }

  return (
    <main className="flex flex-col min-h-screen">
      {/* Hero Section with Product Info */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent"></div>
        <div className="container mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-5xl mx-auto text-center"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              {product.name}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              {product.description}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <div className="text-4xl font-bold text-primary">
                ${product.price}
                <span className="text-sm text-muted-foreground ml-2">{product.currency}</span>
              </div>
              <CheckoutButton 
                product={product} 
                size="lg" 
                className="text-lg px-8"
                text="Get Started Now"
              />
            </div>

            {product.image && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative h-96 rounded-xl overflow-hidden shadow-2xl"
              >
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      {product.features && product.features.length > 0 && (
        <section className="py-20 px-4 bg-muted/30">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl font-bold mb-4">Key Features</h2>
              <p className="text-xl text-muted-foreground">Everything you need to succeed</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {product.features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-card p-6 rounded-xl border border-border hover:border-primary/50 transition-all hover:shadow-lg"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature}</h3>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Use existing template sections */}
      <BentoSection />
      <TestimonialSection />
      <FAQSection />
      
      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied customers using {product.name}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="text-3xl font-bold">
                Only ${product.price} {product.currency}
              </div>
              <CheckoutButton 
                product={product} 
                size="lg" 
                className="text-lg px-8"
                text="Buy Now"
              />
            </div>
          </motion.div>
        </div>
      </section>

      <FooterSection />
    </main>
  );
}