"use client";

import { Marquee } from "../marquee";
import { cn } from "../lib/utils";
import { Star } from "lucide-react";
import { Avatar, AvatarFallback } from "../avatar";

export const Highlight = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span
    className={cn(
      "font-semibold text-primary",
      className,
    )}
  >
    {children}
  </span>
);

export interface TestimonialCardProps {
  name: string;
  role: string;
  img?: string;
  description: React.ReactNode;
  className?: string;
  [key: string]: any;
}

export const TestimonialCard = ({
  description,
  name,
  img,
  role,
  className,
  ...props // Capture the rest of the props
}: TestimonialCardProps) => (
  <div
    className={cn(
      "mb-6 flex w-full cursor-pointer break-inside-avoid flex-col items-center justify-between gap-5 rounded-2xl p-5",
      // light styles
      "border border-neutral-200 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_6px_22px_rgba(0,0,0,0.06)] transition-shadow",
      // dark styles
      "dark:bg-black dark:border-white/10",
      className
    )}
    {...props} // Spread the rest of the props here
  >
    <div className="select-none text-[15px] leading-6 text-neutral-700 dark:text-neutral-300">
      {description}
      <div className="mt-2 flex flex-row">
        <Star className="size-4 text-yellow-500 fill-yellow-500" />
        <Star className="size-4 text-yellow-500 fill-yellow-500" />
        <Star className="size-4 text-yellow-500 fill-yellow-500" />
        <Star className="size-4 text-yellow-500 fill-yellow-500" />
        <Star className="size-4 text-yellow-500 fill-yellow-500" />
      </div>
    </div>

    <div className="flex w-full select-none items-center justify-start gap-5">
      <Avatar src={img} alt={name}>
        <AvatarFallback className="bg-primary px-2 py-1 text-xl font-medium text-primary-foreground">
          {name?.charAt(0) ?? "?"}
        </AvatarFallback>
      </Avatar>

      <div>
        <p className="font-medium text-neutral-700 dark:text-neutral-200">{name}</p>
        <p className="text-xs font-normal text-neutral-400 dark:text-neutral-400">{role}</p>
      </div>
    </div>
  </div>
);

const testimonials = [
  {
    name: "Alex Rivera",
    role: "CTO at InnovateTech",
    img: "https://randomuser.me/api/portraits/men/91.jpg",
    description: (
      <p>
        The AI-driven analytics from #QuantumInsights have revolutionized our
        product development cycle.
        <Highlight>
          Insights are now more accurate and faster than ever.
        </Highlight>{" "}
        A game-changer for tech companies.
      </p>
    ),
  },
  {
    name: "Samantha Lee",
    role: "Marketing Director at NextGen Solutions",
    img: "https://randomuser.me/api/portraits/women/12.jpg",
    description: (
      <p>
        Implementing #AIStream&apos;s customer prediction model has drastically
        improved our targeting strategy.
        <Highlight>Seeing a 50% increase in conversion rates!</Highlight> Highly
        recommend their solutions.
      </p>
    ),
  },
  {
    name: "Raj Patel",
    role: "Founder & CEO at StartUp Grid",
    img: "https://randomuser.me/api/portraits/men/45.jpg",
    description: (
      <p>
        As a startup, we need to move fast and stay ahead. #CodeAI&apos;s
        automated coding assistant helps us do just that.
        <Highlight>Our development speed has doubled.</Highlight> Essential tool
        for any startup.
      </p>
    ),
  },
  {
    name: "Emily Chen",
    role: "Product Manager at Digital Wave",
    img: "https://randomuser.me/api/portraits/women/83.jpg",
    description: (
      <p>
        #VoiceGen&apos;s AI-driven voice synthesis has made creating global
        products a breeze.
        <Highlight>Localization is now seamless and efficient.</Highlight> A
        must-have for global product teams.
      </p>
    ),
  },
  {
    name: "Michael Brown",
    role: "Data Scientist at FinTech Innovations",
    img: "https://randomuser.me/api/portraits/men/1.jpg",
    description: (
      <p>
        Leveraging #DataCrunch&apos;s AI for our financial models has given us
        an edge in predictive accuracy.
        <Highlight>
          Our investment strategies are now powered by real-time data analytics.
        </Highlight>{" "}
        Transformative for the finance industry.
      </p>
    ),
  },
  {
    name: "Linda Wu",
    role: "VP of Operations at LogiChain Solutions",
    img: "https://randomuser.me/api/portraits/women/5.jpg",
    description: (
      <p>
        #LogiTech&apos;s supply chain optimization tools have drastically
        reduced our operational costs.
        <Highlight>
          Efficiency and accuracy in logistics have never been better.
        </Highlight>{" "}
      </p>
    ),
  },
  {
    name: "Carlos Gomez",
    role: "Head of R&D at EcoInnovate",
    img: "https://randomuser.me/api/portraits/men/14.jpg",
    description: (
      <p>
        By integrating #GreenTech&apos;s sustainable energy solutions,
        we&apos;ve seen a significant reduction in carbon footprint.
        <Highlight>
          Leading the way in eco-friendly business practices.
        </Highlight>{" "}
        Pioneering change in the industry.
      </p>
    ),
  },
  {
    name: "Aisha Khan",
    role: "Chief Marketing Officer at Fashion Forward",
    img: "https://randomuser.me/api/portraits/women/56.jpg",
    description: (
      <p>
        #TrendSetter&apos;s market analysis AI has transformed how we approach
        fashion trends.
        <Highlight>
          Our campaigns are now data-driven with higher customer engagement.
        </Highlight>{" "}
        Revolutionizing fashion marketing.
      </p>
    ),
  },
  {
    name: "Tom Chen",
    role: "Director of IT at HealthTech Solutions",
    img: "https://randomuser.me/api/portraits/men/18.jpg",
    description: (
      <p>
        Implementing #MediCareAI in our patient care systems has improved
        patient outcomes significantly.
        <Highlight>
          Technology and healthcare working hand in hand for better health.
        </Highlight>{" "}
        A milestone in medical technology.
      </p>
    ),
  },
  {
    name: "Sofia Patel",
    role: "CEO at EduTech Innovations",
    img: "https://randomuser.me/api/portraits/women/73.jpg",
    description: (
      <p>
        #LearnSmart&apos;s AI-driven personalized learning plans have doubled
        student performance metrics.
        <Highlight>
          Education tailored to every learner&apos;s needs.
        </Highlight>{" "}
        Transforming the educational landscape.
      </p>
    ),
  },
  {
    name: "Jake Morrison",
    role: "CTO at SecureNet Tech",
    img: "https://randomuser.me/api/portraits/men/25.jpg",
    description: (
      <p>
        With #CyberShield&apos;s AI-powered security systems, our data
        protection levels are unmatched.
        <Highlight>Ensuring safety and trust in digital spaces.</Highlight>{" "}
        Redefining cybersecurity standards.
      </p>
    ),
  },
  {
    name: "Nadia Ali",
    role: "Product Manager at Creative Solutions",
    img: "https://randomuser.me/api/portraits/women/78.jpg",
    description: (
      <p>
        #DesignPro&apos;s AI has streamlined our creative process, enhancing
        productivity and innovation.
        <Highlight>Bringing creativity and technology together.</Highlight> A
        game-changer for creative industries.
      </p>
    ),
  },
  {
    name: "Omar Farooq",
    role: "Founder at Startup Hub",
    img: "https://randomuser.me/api/portraits/men/54.jpg",
    description: (
      <p>
        #VentureAI&apos;s insights into startup ecosystems have been invaluable
        for our growth and funding strategies.
        <Highlight>Empowering startups with data-driven decisions.</Highlight> A
        catalyst for startup success.
      </p>
    ),
  },
];

export default function Testimonials() {
  function getColumns<T>(items: T[], columns: number): T[][] {
    const cols: T[][] = Array.from({ length: columns }, () => []);
    items.forEach((item, idx) => cols[idx % columns].push(item));
    return cols;
  }
  return (
    <section className="py-14">
      <div className="container max-w-6xl">
        <h2 className="mb-2 text-center text-4xl font-bold tracking-tight md:text-4xl">Reviews</h2>
        <div className="relative mt-2 overflow-hidden">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {getColumns(testimonials, 3).map((colItems, i) => (
                <Marquee
                  vertical
                  pauseOnHover
                  key={i}
                  reverse={i % 2 === 1}
                  className={cn(
                    "h-[620px] md:h-[660px]",
                    i === 0 && "[--duration:55s]",
                    i === 1 && "[--duration:65s]",
                    i === 2 && "[--duration:50s]",
                    i === 3 && "[--duration:70s]",
                  )}
                >
                  {colItems.map((card, idx) => (
                    <div key={idx} className="px-1">
                      <TestimonialCard {...card} />
                    </div>
                  ))}
                </Marquee>
              ))}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 md:h-24 w-full bg-gradient-to-t from-background to-transparent"></div>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 md:h-24 w-full bg-gradient-to-b from-background to-transparent"></div>
        </div>
      </div>
    </section>
  );
}
