import { Check, Zap, Shield, Clock, Globe, Headphones } from 'lucide-react'

interface Feature {
  icon: React.ReactNode
  title: string
  description: string
}

interface FeaturesProps {
  features?: string[]
  metadata?: any
}

export function FeaturesSection({ features, metadata }: FeaturesProps) {
  // Default features if none provided
  const defaultFeatures: Feature[] = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Lightning Fast',
      description: 'Instant setup and immediate results. Start seeing benefits from day one.'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security with 99.9% uptime guarantee.'
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: 'Lifetime Updates',
      description: 'Get all future updates and improvements at no extra cost.'
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: 'Works Everywhere',
      description: 'Compatible with all major platforms and browsers.'
    },
    {
      icon: <Headphones className="w-6 h-6" />,
      title: 'Premium Support',
      description: '24/7 dedicated support team ready to help you succeed.'
    },
    {
      icon: <Check className="w-6 h-6" />,
      title: 'Money Back Guarantee',
      description: '30-day money back guarantee if you\'re not completely satisfied.'
    }
  ]

  // Custom features from product data
  const customFeatures = features?.map((feature, index) => ({
    icon: <Check className="w-6 h-6" />,
    title: feature.split('-')[0]?.trim() || feature,
    description: feature
  }))

  const displayFeatures = customFeatures?.length ? customFeatures : defaultFeatures

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Product Features</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Everything you need to succeed, all in one powerful package
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {displayFeatures.slice(0, 6).map((feature, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Extended Features List */}
        {displayFeatures.length > 6 && (
          <div className="mt-12">
            <h3 className="text-xl font-semibold mb-6 text-center">More Features</h3>
            <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {displayFeatures.slice(6).map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <h4 className="font-medium">{feature.title}</h4>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Benefits/Metadata */}
        {metadata?.benefits && (
          <div className="mt-12 p-8 bg-blue-50 rounded-2xl">
            <h3 className="text-xl font-semibold mb-6 text-center">What\'s Included</h3>
            <div className="grid md:grid-cols-2 gap-3 max-w-4xl mx-auto">
              {metadata.benefits.map((benefit: string, index: number) => (
                <div key={index} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="text-center mt-12">
          <p className="text-lg mb-6">Ready to get started?</p>
          <button className="px-8 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition">
            Get Instant Access
          </button>
        </div>
      </div>
    </section>
  )
}