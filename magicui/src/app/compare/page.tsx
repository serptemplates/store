import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ComparePage() {
  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">
            Choose Your Style
          </h1>
          <p className="text-lg text-muted-foreground">
            Two different approaches to product landing pages
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Minimal Shadcn Style */}
          <div className="border rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-4">Minimal / Shadcn Style</h2>
            <div className="space-y-3 mb-6 text-sm text-muted-foreground">
              <p>✓ Clean, minimalist design</p>
              <p>✓ Focus on content</p>
              <p>✓ Simple typography</p>
              <p>✓ Subtle interactions</p>
              <p>✓ Maximum readability</p>
              <p>✓ Professional aesthetic</p>
            </div>
            <Button asChild className="w-full">
              <Link href="/minimal">View Minimal Version</Link>
            </Button>
          </div>

          {/* Rich MagicUI Style */}
          <div className="border rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-4">Rich / MagicUI Style</h2>
            <div className="space-y-3 mb-6 text-sm text-muted-foreground">
              <p>✓ Engaging animations</p>
              <p>✓ Rich visual elements</p>
              <p>✓ Gradient accents</p>
              <p>✓ Interactive components</p>
              <p>✓ Modern, bold design</p>
              <p>✓ Eye-catching sections</p>
            </div>
            <Button asChild className="w-full">
              <Link href="/demo-product">View Rich Version</Link>
            </Button>
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">
            Both versions are fully responsive and include:
          </p>
          <div className="inline-flex flex-wrap gap-2 justify-center">
            <span className="px-3 py-1 text-sm rounded-full bg-secondary">Hero Section</span>
            <span className="px-3 py-1 text-sm rounded-full bg-secondary">Video Demo</span>
            <span className="px-3 py-1 text-sm rounded-full bg-secondary">Features</span>
            <span className="px-3 py-1 text-sm rounded-full bg-secondary">Pricing</span>
            <span className="px-3 py-1 text-sm rounded-full bg-secondary">FAQ</span>
            <span className="px-3 py-1 text-sm rounded-full bg-secondary">Stripe Integration</span>
          </div>
        </div>
      </div>
    </div>
  );
}