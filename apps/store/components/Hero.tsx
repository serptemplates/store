import Link from "next/link"
import Image from "next/image"

export function Hero() {
  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 pt-20 pb-16">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <div className="mb-4 inline-flex items-center rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700">
            <span className="mr-1.5">🚀</span>
            <span>Boost Your Conversion Rate</span>
          </div>

          {/* Main Heading */}
          <h1 className="mb-4 max-w-3xl text-3xl font-black leading-tight text-gray-900 sm:text-4xl md:text-5xl">
            Turn More Visitors Into{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Customers</span>
          </h1>

          {/* Subheading */}
          <p className="mb-6 max-w-2xl text-sm leading-tight text-gray-600 sm:text-base">
            Get a detailed conversion audit that shows you exactly what to change on your website to increase sales.
            Trusted by 500+ e-commerce stores.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="https://vz-418aaa14-d44.b-cdn.net/36f6f499-9a52-4404-a9ad-8d249f0071f1/play_720p.mp4"
              target="_blank"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 shadow-sm border border-gray-300 transition-all hover:shadow-md hover:scale-105"
            >
              {/* YouTube Play Button */}
              <svg
                className="h-6 w-6"
                viewBox="0 0 1024 721"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="youtube-red" x1="512.5" y1="719.7" x2="512.5" y2="1.2" gradientTransform="matrix(1 0 0 -1 0 721)">
                    <stop offset="0" style={{ stopColor: "#E52D27" }} />
                    <stop offset="1" style={{ stopColor: "#BF171D" }} />
                  </linearGradient>
                </defs>
                <path
                  fill="url(#youtube-red)"
                  d="M1013,156.3c0,0-10-70.4-40.6-101.4C933.6,14.2,890,14,870.1,11.6C727.1,1.3,512.7,1.3,512.7,1.3h-0.4c0,0-214.4,0-357.4,10.3C135,14,91.4,14.2,52.6,54.9C22,85.9,12,156.3,12,156.3S1.8,238.9,1.8,321.6v77.5C1.8,481.8,12,564.4,12,564.4s10,70.4,40.6,101.4c38.9,40.7,89.9,39.4,112.6,43.7c81.7,7.8,347.3,10.3,347.3,10.3s214.6-0.3,357.6-10.7c20-2.4,63.5-2.6,102.3-43.3c30.6-31,40.6-101.4,40.6-101.4s10.2-82.7,10.2-165.3v-77.5C1023.2,238.9,1013,156.3,1013,156.3z M407,493V206l276,144L407,493z"
                />
                <path
                  fill="#FFFFFF"
                  d="M407,493l276-143L407,206V493z"
                />
                <path
                  opacity="0.12"
                  fill="#420000"
                  d="M407,206l242,161.6l34-17.6L407,206z"
                />
              </svg>
              <span className="text-base">
                <span className="font-bold text-[#112526]">Watch demo video</span>
                <span className="text-gray-600"> (2:35)</span>
              </span>
            </Link>
            <Link
              href="#pricing"
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 text-base font-bold text-white shadow-sm transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-md hover:scale-105"
            >
              Start a 5-day free trial 🚀
            </Link>
          </div>

          {/* Social Proof Banner */}
          <div className="mt-12 w-full max-w-4xl">
            <div className="relative rounded-2xl bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 p-4 shadow-md border border-orange-100">
              <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
                {/* Left side with laurel */}
                <div className="flex items-center gap-2">
                  <div className="text-3xl opacity-20">🌿</div>
                  <div className="flex items-center gap-2">
                    <div className="text-center">
                      <div className="text-3xl font-black text-gray-900">697+</div>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className="h-4 w-4 fill-orange-400" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Center text */}
                <div className="flex-1 text-center md:px-4">
                  <p className="text-sm text-gray-700">
                    Successful digital sellers are already maximizing their profits globally with Parity🚀Rocket.{" "}
                    <Link href="#pricing" className="font-bold text-blue-600 underline">
                      Join them today!
                    </Link>
                  </p>
                </div>

                {/* Right side with avatars */}
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <Image
                        key={i}
                        src={`https://i.pravatar.cc/40?img=${i + 20}`}
                        alt={`Customer ${i}`}
                        width={40}
                        height={40}
                        className="h-8 w-8 rounded-full border-2 border-white"
                      />
                    ))}
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-xs font-bold text-gray-700">
                      +690
                    </div>
                  </div>
                  <div className="text-3xl opacity-20">🌿</div>
                </div>
              </div>
            </div>
          </div>

          {/* Optional: Hero Image/Mockup */}
          <div className="mt-16 w-full max-w-5xl">
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 shadow-2xl">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-400">Dashboard Preview</span>
              </div>
              {/* Replace with actual image when available */}
              {/* <Image
                src="/hero-mockup.png"
                alt="Conversion Audit Dashboard"
                fill
                className="object-cover"
              /> */}
            </div>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-purple-200 opacity-20 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-blue-200 opacity-20 blur-3xl" />
    </section>
  )
}