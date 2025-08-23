import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Product } from '@/lib/schema';

interface FAQProps {
  product: Product;
}

export function FAQ({ product }: FAQProps) {
  if (!product.faqs || product.faqs.length === 0) {
    return null;
  }

  return (
    <section className="py-20" id="faq">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Frequently asked questions
          </h2>
          
          <Accordion type="single" collapsible className="w-full">
            {product.faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}