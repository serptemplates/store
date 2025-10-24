"use client";

import { useState, useCallback } from "react";

import { ChevronDown } from "lucide-react";

import { cn } from "@repo/ui/lib/utils";

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

type FaqAccordionProps = {
  items: FaqItem[];
};

export function FaqAccordion({ items }: FaqAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  const handleToggle = useCallback((id: string) => {
    setOpenId((current) => (current === id ? null : id));
  }, []);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="bg-white">
        {items.map((item, index) => {
          const isOpen = item.id === openId;
          return (
            <div key={item.id} className={cn(index > 0 && "border-t border-[#e6e8eb]")}>
              <button
                type="button"
                onClick={() => handleToggle(item.id)}
<<<<<<< HEAD
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left text-[16px] font-normal text-[#0a2540] transition hover:bg-[#f8fafc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#635bff] sm:gap-4 sm:px-4 sm:py-3.5"
=======
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left text-[14px] font-normal text-[#0a2540] transition hover:bg-[#f8fafc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#635bff] sm:gap-4 sm:px-4 sm:py-3.5"
>>>>>>> origin/staging
                aria-expanded={isOpen}
                aria-controls={`${item.id}-content`}
                id={`${item.id}-trigger`}
              >
                <ChevronDown
<<<<<<< HEAD
                  className={cn("h-3.5 w-3.5 flex-shrink-0 text-[#0a2540] transition-transform", isOpen && "rotate-180")}
                  aria-hidden="true"
                />
                <span className="flex-1 text-[16px] font-normal">{item.question}</span>
=======
                  className={cn("h-3.5 w-3.5 flex-shrink-0 text-[#94a3b8] transition-transform", isOpen && "rotate-180")}
                  aria-hidden="true"
                />
                <span className="flex-1 text-[14px] font-normal">{item.question}</span>
>>>>>>> origin/staging
              </button>
              <div
                id={`${item.id}-content`}
                role="region"
                aria-labelledby={`${item.id}-trigger`}
<<<<<<< HEAD
                className={cn("pl-6 pr-4 text-[16px] font-normal leading-[1.6] text-[#334155] sm:pl-8", isOpen ? "pb-4 pt-0" : "hidden")}
=======
                className={cn("pl-6 pr-4 text-[14px] font-normal leading-[1.6] text-[#334155] sm:pl-8", isOpen ? "pb-4 pt-0" : "hidden")}
>>>>>>> origin/staging
              >
                <div className="border-t border-[#e6e8eb] pt-4">{item.answer}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
