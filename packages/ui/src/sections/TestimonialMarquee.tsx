"use client";

import React, { ComponentProps } from "react";
import { cn } from "../lib/utils";
import { Button } from "../button";
import { Marquee } from "../marquee";
import { Star } from "lucide-react";

export type Testimonial = {
  id: string | number;
  name: string;
  designation?: string;
  company?: string;
  testimonial: string;
  avatar?: string;
  url?: string;
};

export type TestimonialMarqueeProps = {
  items?: Testimonial[];
  heading?: string;
  className?: string;
};

const defaultItems: Testimonial[] = [
  { id: 1, name: "Happy User", designation: "", company: "", testimonial: "This product has completely transformed the way we work. The efficiency and ease of use are unmatched!" },
  { id: 2, name: "Power User", designation: "", company: "", testimonial: "This tool has saved me hours of work! The analytics and reporting features are incredibly powerful." },
  { id: 3, name: "Designer", designation: "", company: "", testimonial: "An amazing tool that simplifies complex tasks. Highly recommended for professionals in the industry." },
  { id: 4, name: "Marketer", designation: "", company: "", testimonial: "I've seen a significant improvement in our team's productivity since we started using this service." },
  { id: 5, name: "Developer", designation: "", company: "", testimonial: "The best investment we've made! The support team is also super responsive and helpful." },
  { id: 6, name: "PM", designation: "", company: "", testimonial: "The user experience is top-notch! The interface is clean, intuitive, and easy to navigate." },
];

export function TestimonialMarquee({ items = defaultItems, heading = "Testimonials", className }: TestimonialMarqueeProps) {
  return (
    <section className={cn("py-28", className)}>
      <div className="px-4 sm:px-6 lg:px-8">
        <h2 className="mb-10 text-center text-4xl font-semibold tracking-tight md:text-5xl">{heading}</h2>
      </div>
      <div className="space-y-4">
        <Marquee className="[--duration:36s]">
          <TestimonialList items={items} />
        </Marquee>
        <Marquee reverse className="[--duration:42s]">
          <TestimonialList items={items} />
        </Marquee>
        <Marquee className="[--duration:48s]">
          <TestimonialList items={items} />
        </Marquee>
      </div>
    </section>
  );
}

function TestimonialList({ items }: { items: Testimonial[] }) {
  return (
    <div className="flex items-stretch gap-6">
      {items.map((t) => (
        <div key={t.id} className="min-w-80 max-w-sm rounded-xl border bg-accent p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-200 text-amber-700 shadow-inner">
                <Star className="h-5 w-5" fill="currentColor" />
              </span>
              <div>
                <p className="text-lg font-semibold">{t.name}</p>
                {t.designation && <p className="text-sm text-muted-foreground">{t.designation}</p>}
              </div>
            </div>
            {t.url && (
              <Button asChild size="icon" variant="ghost">
                <a href={t.url} target="_blank" rel="noopener noreferrer" aria-label="View on X/Twitter">
                  <TwitterLogo className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
          <p className="mt-5 text-[17px]">{t.testimonial}</p>
        </div>
      ))}
    </div>
  );
}

function TwitterLogo(props: ComponentProps<"svg">) {
  return (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <title>X</title>
      <path
        fill="currentColor"
        d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"
      />
    </svg>
  );
}

export default TestimonialMarquee;
