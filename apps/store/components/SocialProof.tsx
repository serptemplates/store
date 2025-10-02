"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"

const avatarImages = [
  { src: "https://i.pravatar.cc/150?img=8", alt: "Customer 1" },
  { src: "https://i.pravatar.cc/150?img=9", alt: "Customer 2" },
  { src: "https://i.pravatar.cc/150?img=10", alt: "Customer 3" },
  { src: "https://i.pravatar.cc/150?img=11", alt: "Customer 4" },
  { src: "https://i.pravatar.cc/150?img=12", alt: "Customer 5" },
  { src: "https://i.pravatar.cc/150?img=13", alt: "Customer 6" },
  { src: "https://i.pravatar.cc/150?img=14", alt: "Customer 7" },
]

function AnimatedCounter({ target }: { target: number }) {
  const counterRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const element = counterRef.current
    if (!element) return

    let start: number | null = null
    const duration = 2000 // 2 seconds

    function easeOutExpo(t: number): number {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
    }

    function animateCounter(timestamp: number) {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      const eased = easeOutExpo(progress)
      const current = Math.floor(eased * target)

      if (element) {
        element.textContent = current.toString()
      }

      if (progress < 1) {
        requestAnimationFrame(animateCounter)
      } else if (element) {
        element.textContent = target.toString()
      }
    }

    requestAnimationFrame(animateCounter)
  }, [target])

  return (
    <>
      <span ref={counterRef}>0</span>+
    </>
  )
}

export function SocialProof() {
  return (
    <section className="w-full overflow-hidden bg-gradient-to-b from-white to-gray-50 py-20">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex flex-col items-center justify-center gap-12">

          {/* Top Stats Bar */}
          <div className="flex items-center justify-center gap-4 rounded-full bg-white px-8 py-4 shadow-lg">
            {/* Left decoration */}
            <div className="text-4xl text-yellow-400">👑</div>

            {/* Counter section */}
            <div className="flex items-center gap-3">
              <span className="text-4xl font-black text-gray-900">
                <AnimatedCounter target={697} />
              </span>

              {/* Star rating */}
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

            {/* Right decoration */}
            <div className="text-4xl text-yellow-400">👑</div>
          </div>

          {/* Main content */}
          <div className="text-center">
            <p className="mb-8 text-xl text-gray-700">
              Successful digital sellers are already maximizing their profits globally with{" "}
              <span className="font-bold">Parity 🚀 Rocket</span>.{" "}
              <Link href="#pricing" className="text-[#037AFF] underline hover:text-blue-700">
                Join them today!
              </Link>
            </p>

            {/* Avatar Stack */}
            <div className="flex items-center justify-center">
              <div className="flex -space-x-4">
                {avatarImages.map((avatar, index) => (
                  <div
                    key={index}
                    className="relative h-16 w-16 overflow-hidden rounded-full border-3 border-white bg-gray-200 shadow-md transition-transform hover:z-10 hover:scale-110"
                    style={{ zIndex: avatarImages.length - index }}
                  >
                    <Image
                      src={avatar.src}
                      alt={avatar.alt}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}

                {/* "+690" badge */}
                <div className="relative z-20 flex h-16 w-16 items-center justify-center rounded-full border-3 border-white bg-gradient-to-br from-[#037AFF] to-blue-600 text-sm font-bold text-white shadow-md">
                  +690
                </div>
              </div>
            </div>
          </div>

          {/* Optional: Bottom testimonial cards */}
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Sarah M.",
                role: "E-commerce Owner",
                text: "Increased our conversion rate by 42% in just 3 weeks!",
              },
              {
                name: "John D.",
                role: "Digital Marketer",
                text: "The audit revealed issues we never would have found ourselves.",
              },
              {
                name: "Lisa K.",
                role: "Store Manager",
                text: "Best investment we've made for our online store's growth.",
              },
            ].map((testimonial, index) => (
              <div
                key={index}
                className="rounded-2xl bg-white p-6 shadow-lg transition-all hover:shadow-xl"
              >
                <div className="mb-4 flex">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="h-5 w-5 fill-yellow-400"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <p className="mb-4 text-gray-600">&ldquo;{testimonial.text}&rdquo;</p>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
