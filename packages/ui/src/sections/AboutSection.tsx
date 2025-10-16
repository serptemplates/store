import { type FC } from "react"
import Image from "next/image"
import { TypographyH2, TypographyP } from "@repo/ui"

export interface TeamMember {
  name: string
  title?: string
  description: string
  image?: string
}

export interface AboutSectionProps {
  title?: string
  subtitle?: string
  team: TeamMember[]
}

export const AboutSection: FC<AboutSectionProps> = ({
  title = "Nice to meet ya 👋",
  subtitle,
  team
}) => {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Title Section */}
        <div className="text-center mb-12">
          <TypographyH2 className="text-center">
            {title}
          </TypographyH2>
        </div>

        {/* Team Members */}
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {team.map((member, index) => (
            <div key={index} className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col">
              {/* Image with max constraints */}
              {member.image ? (
                <div className="relative flex justify-center items-center bg-gradient-to-br from-blue-50 to-indigo-100" style={{ maxWidth: '700px', maxHeight: '800px', width: '100%', aspectRatio: '7/8' }}>
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    loading="lazy"
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 700px"
                    quality={85}
                  />
                </div>
              ) : (
                <div className="w-full h-80 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-32 h-32 bg-white/50 backdrop-blur rounded-full mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <p className="text-gray-600 font-medium text-lg">{member.name}</p>
                  </div>
                </div>
              )}

              {/* Content fills remaining space */}
              <div className="flex-1 p-5 bg-gradient-to-br from-gray-50 to-blue-50">
                <TypographyP className="text-base leading-relaxed text-gray-700">
                  <span className="font-semibold text-gray-900">{member.name.split(' ')[0]}</span> is {member.description}
                </TypographyP>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
