'use client';

import { Product } from '../../../../schema';
import { useState } from 'react';

interface MinimalFAQProps {
  product: Product;
}

export default function MinimalFAQ({ product }: MinimalFAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!product.faqs || product.faqs.length === 0) return null;

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-bold tracking-tight text-center mb-12 text-gray-900 dark:text-white">
          Frequently asked questions
        </h2>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {product.faqs.map((faq, index) => (
            <div key={index} className="py-6">
              <button
                onClick={() => toggleItem(index)}
                className="flex w-full items-start justify-between text-left"
              >
                <span className="text-base font-medium text-gray-900 dark:text-white">
                  {faq.question}
                </span>
                <span className="ml-6 flex h-7 items-center">
                  <svg
                    className={`h-6 w-6 transform text-gray-400 transition-transform ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>
              {openIndex === index && (
                <div className="mt-4">
                  <p className="text-base text-gray-600 dark:text-gray-400">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}