import { Button } from '@/components/ui/button';
import { Product } from '@/lib/schema';

interface HeaderProps {
  product: Product;
}

export function Header({ product }: HeaderProps) {
  return (
    <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
      <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="font-bold text-xl">SERP Apps</div>
        <nav className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
          <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
        </nav>
        <Button size="sm">Get Started</Button>
      </div>
    </header>
  );
}