import { Hero } from "@/components/Hero"
import { SocialProof } from "@/components/SocialProof"
import { WhoIsBehind } from "@/components/home/WhoIsBehind"
import { ConversionAudit } from "@/components/ConversionAudit"
import { FAQ } from "@/components/FAQ"

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <Hero />

      {/* Social Proof Section */}
      <SocialProof />

      {/* ConversionAudit Section */}
      <ConversionAudit />

      {/* WhoIsBehind Section */}
      <WhoIsBehind />

      {/* FAQ Section */}
      <section className="w-full bg-gradient-to-b from-white to-gray-50 py-32">
        <div className="container mx-auto max-w-4xl px-4">
          <h2 className="mb-20 text-center text-5xl font-black text-gray-900 sm:text-6xl">
            FAQs
          </h2>
          <FAQ />
        </div>
      </section>
    </div>
  )
}