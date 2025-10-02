"use client";

import { useState } from "react";

export type FAQ = { question: string; answer: string };

export type FaqSectionProps = {
  faqs: FAQ[];
};

export function FaqSection({ faqs }: FaqSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!faqs.length) {
    return null;
  }

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="w-full bg-blue-50/30 py-24">
      <div className="container mx-auto max-w-3xl px-4">
        <h2 className="mb-16 text-center text-2xl md:text-3xl font-bold text-gray-900">
          Frequently asked questions
        </h2>
        <div className="space-y-4">
          {faqs.map((item, index) => (
            <div
              key={index}
              className="rounded-2xl bg-blue-100/50 transition-all hover:bg-blue-100/40"
            >
              <button
                onClick={() => toggleFaq(index)}
                className="flex w-full items-center justify-between p-8 text-left transition-all"
                aria-expanded={openIndex === index}
              >
                <h3 className="pr-4 text-lg font-semibold text-gray-900">
                  {index + 1}. {item.question}
                </h3>
                <svg
                  className={`h-6 w-6 flex-shrink-0 text-gray-500 transition-transform ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? "max-h-96" : "max-h-0"
                }`}
              >
                <div className="px-8 pb-8">
                  <p className="text-base leading-relaxed text-gray-600">
                    {item.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FaqSection;
