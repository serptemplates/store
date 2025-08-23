import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Zap, ArrowRight, Check, Code2 } from 'lucide-react';
import { Product } from '@/lib/schema';

interface CTAProps {
  product: Product;
}

export function CTA({ product }: CTAProps) {
  return (
    <section className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-background"></div>
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl animate-pulse"></div>
      <div className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-secondary/20 blur-3xl animate-pulse [animation-delay:1s]"></div>
      <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-primary/10 blur-2xl animate-pulse [animation-delay:2s]"></div>
      
      <div className="relative mx-auto max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-6">
              Get {product.name} Today
            </h2>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-lg">
              Download content from 123movies instantly without ads or popups. Professional tool for seamless content management.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="group bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all"
              >
                <Zap className="mr-2 h-5 w-5" />
                Get it Now
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
            
            <div className="flex items-center gap-6 mt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                No Ads
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Easy Setup
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl blur-2xl"></div>
            <Card className="relative bg-gradient-to-br from-card via-card to-card/50 backdrop-blur-sm border-2 p-8">
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-5xl font-bold mb-2">$29</div>
                  <div className="text-muted-foreground">One-time purchase</div>
                </div>
                
                <div className="space-y-4">
                  {[
                    "Stream-to-file conversion",
                    "HD quality downloads", 
                    "Batch download support",
                    "Resume interrupted downloads",
                    "No watermarks or ads"
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}