"use client"

import { useState } from "react"
import Image from "next/image"
import type { StaticImageData } from "next/image"
import { TypographyH2 } from "@repo/ui"

interface SocialProofScreenshot {
  id: string
  src: string | StaticImageData
  alt: string
  width?: number
  height?: number
}

interface SocialProofScreenshotsProps {
  screenshots?: SocialProofScreenshot[]
}

// Default screenshots for backwards compatibility
const defaultScreenshots: SocialProofScreenshot[] = [
  { id: "alex-t", src: "/reviews/alex-t.png", alt: "Alex T. testimonial", width: 2688, height: 582 },
  { id: "ali", src: "/reviews/ali.png", alt: "Ali testimonial", width: 1562, height: 460 },
  { id: "bill-k", src: "/reviews/bill-k.png", alt: "Bill K. testimonial", width: 1492, height: 324 },
  { id: "brett", src: "/reviews/brett.png", alt: "Brett testimonial", width: 1886, height: 602 },
  { id: "ganesh-i", src: "/reviews/ganesh-i.png", alt: "Ganesh I. testimonial", width: 1534, height: 434 },
  { id: "herry-e", src: "/reviews/herry-e.png", alt: "Herry E. testimonial", width: 1834, height: 724 },
  { id: "jonas-h", src: "/reviews/jonas-h.png", alt: "Jonas H. testimonial", width: 1409, height: 349 },
  { id: "k-vimeo", src: "/reviews/k.vimeo.png", alt: "K Vimeo testimonial", width: 1742, height: 796 },
  { id: "marcos-p", src: "/reviews/marcos-p.png", alt: "Marcos P. testimonial", width: 1399, height: 469 },
  { id: "odd-e", src: "/reviews/odd-e.png", alt: "Odd E. testimonial", width: 1906, height: 566 },
  { id: "outrun", src: "/reviews/outrun.png", alt: "Outrun testimonial", width: 1902, height: 282 },
  { id: "rafa-s", src: "/reviews/rafa-s.png", alt: "Rafa S. testimonial", width: 1888, height: 322 },
  { id: "rickgick5888", src: "/reviews/rickgick5888.png", alt: "Rick testimonial", width: 2691, height: 589 },
  { id: "todd-h", src: "/reviews/todd-h.png", alt: "Todd H. testimonial", width: 1504, height: 404 },
  { id: "steve", src: "/reviews/steve.png", alt: "Steve testimonial", width: 1752, height: 454 },
  { id: "trevor-h", src: "/reviews/trevor-h.png", alt: "Trevor H. testimonial", width: 1892, height: 220 },
  { id: "uffeptv", src: "/reviews/uffePTV.png", alt: "Uffe PTV testimonial", width: 2364, height: 368 },
]

export function SocialProofScreenshots({ screenshots = defaultScreenshots }: SocialProofScreenshotsProps = {}) {
  const [errorImages, setErrorImages] = useState<Set<string>>(new Set())

  const handleImageError = (id: string) => {
    setErrorImages((prev) => new Set(prev).add(id))
  }

  return (
    <section className="py-16 bg-gray-100">
      <div className="container mx-auto px-4 max-w-screen-2xl 2xl:max-w-[1600px]">
        <div className="text-center mb-12 space-y-3">
          <TypographyH2 className="text-center">
            Happy users
          </TypographyH2>
        </div>

        <div className="columns-1 lg:columns-2 gap-6 lg:gap-8 [column-fill:_balance]">
          {screenshots.map((screenshot) => (
            !errorImages.has(screenshot.id) && (
              <div
                key={screenshot.id}
                className="relative mb-6 break-inside-avoid last:mb-0"
              >
                <Image
                  src={typeof screenshot.src === 'string' ? screenshot.src : screenshot.src.src || screenshot.src}
                  alt={screenshot.alt}
                  width={
                    typeof screenshot.src === "object" && "width" in screenshot.src
                      ? screenshot.src.width
                      : screenshot.width ?? 1600
                  }
                  height={
                    typeof screenshot.src === "object" && "height" in screenshot.src
                      ? screenshot.src.height
                      : screenshot.height ?? 500
                  }
                  className="w-full h-auto rounded-xl shadow-sm"
                  onError={() => handleImageError(screenshot.id)}
                  loading="lazy"
                  sizes="(max-width: 1024px) 100vw, 720px"
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
