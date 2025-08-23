'use client';

import { Product } from '../../../../schema';

interface MinimalHeroProps {
  product: Product;
  onPurchase?: () => void;
}

export default function MinimalHero({ product, onPurchase }: MinimalHeroProps) {
  return (
    <section className="px-6 py-24 md:py-32 lg:py-40">
      <div className="mx-auto max-w-3xl text-center">
        {product.status === 'coming_soon' && (
          <p className="text-sm font-medium text-gray-500 mb-4">
            Coming Soon
          </p>
        )}
        
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-gray-900 dark:text-white">
          {product.name}
        </h1>
        
        <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">
          {product.tagline}
        </p>
        
        <div className="mt-10 flex items-center justify-center gap-x-6">
          {product.status === 'live' && (
            <button 
              onClick={onPurchase}
              className="rounded-md bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
            >
              Get started
            </button>
          )}
          
          {product.github_repo_url && (
            <a 
              href={product.github_repo_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm font-semibold leading-6 text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300"
            >
              View on GitHub <span aria-hidden="true">→</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}