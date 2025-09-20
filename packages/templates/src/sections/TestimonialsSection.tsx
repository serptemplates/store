"use client";

import TestimonialMarquee, { type Testimonial } from "@repo/ui/sections/TestimonialMarquee";

export type TestimonialsSectionProps = {
  testimonials?: Testimonial[];
  heading?: string;
};

export function TestimonialsSection({ testimonials, heading = "Reviews" }: TestimonialsSectionProps) {
  if (!testimonials || testimonials.length === 0) {
    return null;
  }

  return <TestimonialMarquee heading={heading} items={testimonials} />;
}

export default TestimonialsSection;
