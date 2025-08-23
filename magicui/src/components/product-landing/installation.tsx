'use client';

import { Product } from '../../../../schema';
import { Terminal, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ProductInstallationProps {
  product: Product;
}

export default function ProductInstallation({ product }: ProductInstallationProps) {
  const [copied, setCopied] = useState(false);

  if (!product.installation_instructions) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(product.installation_instructions);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-20 md:py-32 bg-secondary/5">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-full mb-4">
              <Terminal className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Quick Installation
            </h2>
            <p className="text-lg text-muted-foreground">
              Get up and running in minutes
            </p>
          </div>

          <div className="relative">
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-muted-foreground">
                  Installation Steps
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <pre className="overflow-x-auto">
                <code className="text-sm">{product.installation_instructions}</code>
              </pre>
            </div>
          </div>

          {product.supported_operating_systems && product.supported_operating_systems.length > 0 && (
            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground mb-3">Supported platforms:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {product.supported_operating_systems.map((os) => (
                  <span 
                    key={os}
                    className="px-3 py-1 text-sm rounded-full bg-secondary text-secondary-foreground capitalize"
                  >
                    {os}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}