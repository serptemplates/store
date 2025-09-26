'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface FAQ {
  question: string
  answer: string
}

interface FAQSectionProps {
  faqs?: FAQ[]
}

export function FAQSection({ faqs }: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const defaultFAQs: FAQ[] = [
    {
      question: 'How long does shipping take?',
      answer: 'Standard shipping typically takes 5-7 business days. Express shipping is available for 2-3 business day delivery. Digital products are delivered instantly via email after purchase.'
    },
    {
      question: 'What is your return policy?',
      answer: 'We offer a 30-day money-back guarantee. If you\'re not completely satisfied with your purchase, simply contact our support team for a full refund. No questions asked.'
    },
    {
      question: 'Is this compatible with my existing setup?',
      answer: 'Yes! Our product is designed to work with all major platforms and browsers. We provide detailed setup guides and our support team is available 24/7 to help with any integration questions.'
    },
    {
      question: 'Do you offer customer support?',
      answer: 'Absolutely! We provide 24/7 customer support via email and live chat. Premium customers also get access to priority phone support and dedicated account managers.'
    },
    {
      question: 'Can I upgrade or downgrade my plan?',
      answer: 'Yes, you can change your plan at any time. Upgrades take effect immediately, and downgrades will be applied at the end of your current billing cycle. No contracts or cancellation fees.'
    },
    {
      question: 'Is my data secure?',
      answer: 'Security is our top priority. We use industry-standard encryption, regular security audits, and comply with GDPR and other privacy regulations. Your data is always protected and never shared with third parties.'
    }
  ]

  const displayFAQs = faqs?.length ? faqs : defaultFAQs

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-lg text-gray-600">
            Everything you need to know about our product
          </p>
        </div>

        <div className="space-y-4">
          {displayFAQs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              <button
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="font-medium text-gray-900">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-4">
                  <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">Still have questions?</p>
          <button className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition">
            Contact Support
          </button>
        </div>
      </div>
    </section>
  )
}