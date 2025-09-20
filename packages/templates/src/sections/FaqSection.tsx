"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@repo/ui";

export type FAQ = { question: string; answer: string };

export type FaqSectionProps = {
  faqs: FAQ[];
};

export function FaqSection({ faqs }: FaqSectionProps) {
  if (!faqs.length) {
    return null;
  }

  return (
    <section className="border-t bg-muted/30">
      <div className="container py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight">FAQ</h2>
          <Accordion type="single" collapsible className="w-full divide-y divide-border/50">
            {faqs.map((faq, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`} className="border-0 rounded-none px-0">
                <AccordionTrigger className="px-0 font-medium hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-6 text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

export default FaqSection;
