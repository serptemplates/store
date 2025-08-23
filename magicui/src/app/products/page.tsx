'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { CheckoutButton } from '@/components/checkout-button';
import { FooterSection } from '@/components/sections/footer-section';
import { Product } from '@/lib/ghl-api';
import { motion } from 'motion/react';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col min-h-screen">
      <div className="flex-1">
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Our Products
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Discover our suite of professional tools designed to accelerate your business growth
              </p>
            </motion.div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-muted rounded-xl h-64 mb-4"></div>
                    <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="group"
                  >
                    <div className="bg-card rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl">
                      <div className="relative h-48 bg-gradient-to-br from-primary/10 to-primary/5">
                        {product.image && (
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"></div>
                      </div>
                      
                      <div className="p-6">
                        <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                          {product.name}
                        </h3>
                        <p className="text-muted-foreground mb-4 line-clamp-2">
                          {product.description}
                        </p>
                        
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-3xl font-bold text-primary">
                            ${product.price}
                            <span className="text-sm text-muted-foreground ml-1">
                              {product.currency}
                            </span>
                          </span>
                        </div>

                        {product.features && product.features.length > 0 && (
                          <ul className="space-y-1 mb-6">
                            {product.features.slice(0, 3).map((feature, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground flex items-center">
                                <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {feature}
                              </li>
                            ))}
                          </ul>
                        )}

                        <div className="flex gap-3">
                          <Link href={`/products/${product.slug}`} className="flex-1">
                            <Button variant="outline" className="w-full">
                              Learn More
                            </Button>
                          </Link>
                          <div className="flex-1">
                            <CheckoutButton 
                              product={product} 
                              className="w-full"
                              text="Buy Now"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {!loading && products.length === 0 && (
              <div className="text-center py-20">
                <p className="text-xl text-muted-foreground">
                  No products available at the moment.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
      
      <FooterSection />
    </main>
  );
}