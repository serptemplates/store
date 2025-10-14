"use client";

import TestimonialMarquee, { type Testimonial } from "./TestimonialMarquee";

const fallbackTestimonials: Testimonial[] = [
  {
    id: "harry-entrep",
    name: "@harry.entrep",
    testimonial:
      "hey bro this really helped alot, but i wanted to request if u can make a tutorial about downloading videos/content from Whop? is that possible and can u do it? willing to pay another software product if u did",
  },
  {
    id: "jonas-hereora",
    name: "Jonas Hereora",
    testimonial: "Agreed, this downloader is great.",
  },
  {
    id: "rickgick5558",
    name: "@rickgick5558",
    testimonial:
      "Thanks bro for your extension, it works great and actually saves my sanity no need to mess around with tokens or random commands. Always a pleasure supporting talented devs like you.",
  },
  {
    id: "alex-tkachenko555",
    name: "@AlexTkachenko555",
    testimonial: "Thank you very much! It was absolutely worth the money.",
  },
];

export type TestimonialsSectionProps = {
  testimonials?: Testimonial[];
  heading?: string;
};

export function TestimonialsSection({ testimonials, heading = "Reviews" }: TestimonialsSectionProps) {
  const items = testimonials && testimonials.length > 0 ? testimonials : fallbackTestimonials;

  return <TestimonialMarquee heading={heading} items={items} />;
}

export default TestimonialsSection;
