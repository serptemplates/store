export interface TeamMember {
  name: string
  image: string
  description: string
}

export const teamMembers: TeamMember[] = [
  {
    name: "Devin Schumacher",
    image: "/people/devin-schumacher.png",
    description: "the founder of SERP, entrepreneur, 21st century quomodocunquizer and widely regarded as the world's best SEO & grumpy cat impersonator. He got his start in SEO, building an agency to 20+ employees, 100s of clients & helped 1,000s of business owners across 217+ different industries generate over 200MM+ dollars of new revenue with digital marketing."
  },
  {
    name: "Brian Farley",
    image: "/people/brian-farley.jpeg",
    description: "a fullstack engineer and indiehacker with a passion for building end-to-end solutions and shipping products that matter. Whether it's crafting tech solutions or hustling on side projects, he's always building something new."
  }
]