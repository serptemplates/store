import type { ReactNode } from "react"

interface FAQItem {
  question: string
  answer: string | ReactNode
}

const faqItems: FAQItem[] = [
  {
    question: "Is your checklist suitable only for WooCommerce or other platforms as well?",
    answer: "A: My E-commerce Checklist is not platform related, so it&apos;s useful for any platforms, including Shopify, Magento, WooCommerce, Wix, BigCommerce, PrestaShop, and dozens of others."
  },
  {
    question: "Our store makes less than 6 figures (less than $100,000). Will this be valuable for me?",
    answer: (
      <>
        <p className="mb-4">
          A: It sure will. Conversion Rate Optimization (CRO) is especially important for newer stores that can&apos;t afford to waste their ad budget running A/B tests to figure out what works and what doesn&apos;t.
        </p>
        <p>
          My E-commerce Checklist will save you both money and time that you&apos;d spend trying to figure these things out for yourself.
        </p>
      </>
    )
  }
]

export function FAQ() {
  return (
    <div className="w-full space-y-10">
      {faqItems.map((item, index) => (
        <div
          key={index}
          className="group rounded-[2rem] bg-gradient-to-br from-gray-100 to-gray-50 p-12 transition-all hover:from-gray-100 hover:to-gray-100 hover:shadow-lg"
        >
          <h3 className="mb-10 flex items-start gap-5 text-xl font-bold text-gray-900 sm:text-2xl">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#037AFF] text-base font-bold text-white shadow-md">
              {index + 1}
            </span>
            <span className="flex-1 leading-relaxed">{item.question}</span>
          </h3>
          <div className="ml-[3.75rem] text-lg leading-relaxed text-gray-600">
            {typeof item.answer === 'string' ? (
              <p>{item.answer}</p>
            ) : (
              item.answer
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
