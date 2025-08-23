import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Zap, Rocket } from 'lucide-react';

const products = [
  {
    id: 'demo-product',
    name: 'DataFlow Pro',
    tagline: 'Transform Your Data Pipeline Management',
    path: '/demo-product',
    icon: <Zap className="h-6 w-6" />,
    gradient: 'from-blue-600 to-cyan-600',
  },
  {
    id: 'pro-app-suite',
    name: 'Pro App Suite',
    tagline: 'Complete suite of professional tools',
    path: '/ghl-product/pro-app-suite',
    icon: <Sparkles className="h-6 w-6" />,
    gradient: 'from-purple-600 to-pink-600',
  },
  {
    id: 'starter-pack',
    name: 'Starter Pack',
    tagline: 'Essential tools to get started',
    path: '/ghl-product/starter-pack',
    icon: <Rocket className="h-6 w-6" />,
    gradient: 'from-green-600 to-teal-600',
  },
];

export default function ProductsShowcase() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Product Landing Pages
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Click any product below to see its dynamic landing page generated from the schema
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {products.map((product) => (
            <Link key={product.id} href={product.path}>
              <div className="group relative bg-card rounded-2xl p-8 border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 cursor-pointer overflow-hidden">
                {/* Background gradient on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${product.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${product.gradient} text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {product.icon}
                </div>

                {/* Content */}
                <h2 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                  {product.name}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {product.tagline}
                </p>

                {/* CTA */}
                <div className="flex items-center text-primary font-medium">
                  View Landing Page
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex flex-col items-center gap-4 p-8 rounded-2xl bg-card border border-border">
            <h3 className="text-lg font-semibold">Landing Page Features</h3>
            <div className="flex flex-wrap gap-3 justify-center text-sm">
              <span className="px-3 py-1 rounded-full bg-secondary">Hero Section</span>
              <span className="px-3 py-1 rounded-full bg-secondary">Video Showcase</span>
              <span className="px-3 py-1 rounded-full bg-secondary">Features Grid</span>
              <span className="px-3 py-1 rounded-full bg-secondary">Pricing</span>
              <span className="px-3 py-1 rounded-full bg-secondary">FAQ</span>
              <span className="px-3 py-1 rounded-full bg-secondary">Installation Guide</span>
              <span className="px-3 py-1 rounded-full bg-secondary">Usage Instructions</span>
              <span className="px-3 py-1 rounded-full bg-secondary">CTA Sections</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}