import { Check } from "lucide-react"
import Link from "next/link"

const features = [
  {
    title: "Up to 70 actionable fixes",
    description: "(for CRO, AOV, UX, design improvements and micro-animations)"
  },
  {
    title: "Top 5 priority fixes list",
    description: "(95/5 rule)"
  },
  {
    title: "Design Solutions",
    description: "(Get visual concepts from 8-figure stores and my personal designs)"
  },
  {
    title: "Product page Audit",
    description: "(for desktop & mobile)"
  },
  {
    title: "Landing page Audit",
    description: "(for desktop & mobile)"
  },
  {
    title: "Checkout process Audit",
    description: "(for desktop & mobile)"
  },
  {
    title: "Thank you page Audit",
    description: "(for desktop & mobile)"
  },
  {
    title: "Upsell page Audit",
    description: "(for desktop & mobile)"
  },
  {
    title: "Cart page Audit",
    description: "(for desktop & mobile)"
  },
  {
    title: "Catalogue page Audit",
    description: "(for desktop & mobile)"
  },
  {
    title: "Home page Audit",
    description: "(for desktop & mobile)"
  }
]

export function ConversionAudit() {
  return (
    <section className="w-full bg-gradient-to-b from-gray-100 to-gray-50 py-32">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="rounded-[2rem] bg-white p-10 shadow-2xl sm:p-14">
          <div className="space-y-12">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-3xl font-black leading-relaxed text-gray-900 sm:text-4xl md:text-5xl">
              <span className="bg-[#B3D8FE] px-2">What will you get</span> by ordering my Conversion Audit?
            </h2>
            <p className="mx-auto mt-8 max-w-2xl text-xl font-medium leading-relaxed text-gray-700">
              After 7 business days of my auditing, you will receive a Figma (free design tool) file with precise ideas on what to change in order to convert more visitors into customers. To give you an idea of the level of detail, here are three real examples:{" "}
              <Link href="#" className="text-[#037AFF] underline underline-offset-2 hover:text-blue-700">
                Example 1,
              </Link>{" "}
              <Link href="#" className="text-[#037AFF] underline underline-offset-2 hover:text-blue-700">
                Example 2,
              </Link>{" "}
              <Link href="#" className="text-[#037AFF] underline underline-offset-2 hover:text-blue-700">
                Example 3,
              </Link>{" "}
              <Link href="#" className="text-[#037AFF] underline underline-offset-2 hover:text-blue-700">
                Example 4
              </Link>
            </p>
          </div>

          {/* Features section */}
          <div className="text-center">
            <h3 className="mb-12 text-2xl font-black text-gray-900 sm:text-3xl">
              <span className="bg-[#B3D8FE] px-2">Here&apos;s exactly what&apos;s inside that file:</span>
            </h3>

            <ul className="mx-auto max-w-2xl space-y-4 text-left">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-4">
                  <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-green-500">
                    <Check className="h-4 w-4 text-white" strokeWidth={3} />
                  </div>
                  <div className="flex-1 text-xl">
                    <span className="font-bold text-gray-900">
                      {feature.title}
                    </span>
                    {feature.description && (
                      <span className="font-medium text-gray-700"> {feature.description}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA and Social Proof */}
          <div className="space-y-6">
            {/* CTA Button */}
            <div className="flex justify-center">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-full bg-[#fed300] px-12 py-5 text-lg font-bold text-gray-900 shadow-lg transition-all hover:scale-105 hover:bg-yellow-400 hover:shadow-xl"
              >
                Take me to the pricing for a Conversion Audit
              </Link>
            </div>

            {/* Social Proof Badge */}
            <div className="flex justify-center">
              <div className="flex items-center justify-center gap-4 rounded-full bg-white px-8 py-4 shadow-lg">
                {/* Left crown */}
                <div className="text-4xl text-yellow-400">👑</div>

                {/* Counter and stars */}
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-black text-gray-900">
                    697+
                  </span>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className="h-6 w-6 fill-yellow-400"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>
                </div>

                {/* Right crown */}
                <div className="text-4xl text-yellow-400">👑</div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </section>
  )
}
