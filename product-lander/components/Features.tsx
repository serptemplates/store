import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileVideo, RefreshCw, CheckCircle, Image, Upload } from 'lucide-react';
import { Product } from '@/lib/schema';

interface FeaturesProps {
  product: Product;
}

export function Features({ product }: FeaturesProps) {
  const featureIcons = [
    { icon: Upload, title: product.features[0] },
    { icon: FileVideo, title: product.features[1] },
    { icon: Download, title: product.features[2] },
    { icon: RefreshCw, title: product.features[3] },
    { icon: CheckCircle, title: product.features[4] },
    { icon: Image, title: product.features[5] },
  ];

  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Features
          </h2>
        </div>
        
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {featureIcons.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card key={index} className="relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 p-6">
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full blur-2xl"></div>
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">{item.title}</h3>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}