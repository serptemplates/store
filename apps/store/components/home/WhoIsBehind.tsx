import Image from "next/image"

interface TeamMember {
  name: string
  image: string
  description: string
}

const teamMembers: TeamMember[] = [
  {
    name: "Jaka",
    image: "/team/jaka.jpg",
    description: "Jaka is the founder of ProteusThemes and Conversion.design. Both are multi-million dollar digital product businesses with more than 50,000 customers combined. Jaka has worked",
  },
  {
    name: "Aaron",
    image: "/team/aaron.jpg",
    description: "Aaron is the founder of Spin Rewriter which is a multi-million dollar SaaS product that is extremely popular in the SEO industry. He is also a full-stack web developer and copywriter.",
  },
]

export function WhoIsBehind() {
  return (
    <section className="w-full bg-gradient-to-b from-white via-blue-50/30 to-white py-32">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mb-20 text-center">
          <h2 className="text-5xl font-black leading-tight tracking-tight text-gray-900 sm:text-6xl md:text-7xl">
            Who is Behind
            <br />
            Parity <span className="inline-block">🚀</span> Rocket?
          </h2>
          <p className="mt-8 text-xl text-gray-600">
            Two <span className="line-through decoration-2">outstanding</span> pretty okay individuals who also happen to be best friends.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-16 md:grid-cols-2">
          {teamMembers.map((member) => (
            <div
              key={member.name}
              className="flex flex-col items-center text-center"
            >
              <div className="mb-8 h-72 w-72 overflow-hidden rounded-full bg-gradient-to-br from-blue-100 to-purple-100 p-1">
                <div className="h-full w-full overflow-hidden rounded-full bg-white p-2">
                  <div className="h-full w-full overflow-hidden rounded-full bg-gradient-to-br from-gray-100 to-gray-200">
                    <Image
                      src={member.image}
                      alt={member.name}
                      width={280}
                      height={280}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              </div>

              <div className="max-w-md">
                <p className="text-lg leading-relaxed text-gray-600">
                  <span className="font-bold text-gray-900">{member.name}</span> {member.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}