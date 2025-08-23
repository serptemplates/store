'use client';

import { Product } from '../../../../schema';

interface MinimalPricingProps {
  product: Product;
  onPurchase?: () => void;
}

export default function MinimalPricing({ product, onPurchase }: MinimalPricingProps) {
  return (
    <section className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{product.name}</h3>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            {product.tagline}
          </p>
          
          <p className="mt-6 flex items-baseline">
            <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">$49</span>
            <span className="ml-1 text-sm text-gray-600 dark:text-gray-400">/lifetime</span>
          </p>
          
          <ul className="mt-8 space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex gap-3">
              <span className="text-green-600">✓</span>
              Lifetime access
            </li>
            <li className="flex gap-3">
              <span className="text-green-600">✓</span>
              Free updates
            </li>
            <li className="flex gap-3">
              <span className="text-green-600">✓</span>
              Premium support
            </li>
            <li className="flex gap-3">
              <span className="text-green-600">✓</span>
              Commercial license
            </li>
          </ul>
          
          <button 
            className="mt-8 w-full rounded-md bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
            onClick={onPurchase}
            disabled={product.status !== 'live'}
          >
            {product.status === 'live' ? 'Get access' : 'Coming soon'}
          </button>
        </div>
      </div>
    </section>
  );
}