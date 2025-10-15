"use client"

import { useState } from "react"
import Image from "next/image"

interface SocialProofScreenshot {
  id: string
  src: string | any // Can be either a URL string or an imported image
  alt: string
}

interface SocialProofScreenshotsProps {
  screenshots?: SocialProofScreenshot[]
}

// Default screenshots for backwards compatibility
const defaultScreenshots: SocialProofScreenshot[] = [
  { id: "alex-t", src: "/reviews/alex-t.png", alt: "Alex T. testimonial" },
  { id: "ali", src: "/reviews/ali.png", alt: "Ali testimonial" },
  { id: "bill-k", src: "/reviews/bill-k.png", alt: "Bill K. testimonial" },
  { id: "ganesh-i", src: "/reviews/ganesh-i.png", alt: "Ganesh I. testimonial" },
  { id: "herry-e", src: "/reviews/herry-e.png", alt: "Herry E. testimonial" },
  { id: "jonas-h", src: "/reviews/jonas-h.png", alt: "Jonas H. testimonial" },
  { id: "marcos-p", src: "/reviews/marcos-p.png", alt: "Marcos P. testimonial" },
  { id: "rickgick5888", src: "/reviews/rickgick5888.png", alt: "Rick testimonial" },
  { id: "todd-h", src: "/reviews/todd-h.png", alt: "Todd H. testimonial" },
]

export function SocialProofScreenshots({ screenshots = defaultScreenshots }: SocialProofScreenshotsProps = {}) {
  const [errorImages, setErrorImages] = useState<Set<string>>(new Set())

  const handleImageError = (id: string) => {
    setErrorImages((prev) => new Set(prev).add(id))
  }

  return (
    <section className="py-16 bg-gray-100">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Happy users
          </h2>
        </div>

        <div className="space-y-4">
          {screenshots.map((screenshot) => (
            !errorImages.has(screenshot.id) && (
              <div
                key={screenshot.id}
                className="relative mx-auto"
                style={{ width: '700px', maxWidth: '100%', height: 'auto' }}
              >
                <Image
                  src={typeof screenshot.src === 'string' ? screenshot.src : screenshot.src.src || screenshot.src}
                  alt={screenshot.alt}
                  width={700}
                  height={400}
                  className="w-full h-auto"
                  onError={() => handleImageError(screenshot.id)}
                  loading="lazy"
                  sizes="(max-width: 768px) 100vw, 700px"
                  quality={85}
                />
              </div>
            )
          ))}
        </div>
      </div>
    </section>
  )
}

export default SocialProofScreenshots
