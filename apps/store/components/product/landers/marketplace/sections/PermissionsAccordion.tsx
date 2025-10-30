"use client";

import { useState, useCallback } from "react";

import { ChevronDown } from "lucide-react";

import { cn } from "@repo/ui/lib/utils";

export type PermissionAccordionItem = {
  id: string;
  label: string;
  scope?: string;
  description?: string;
  learnMoreUrl?: string;
};

type PermissionsAccordionProps = {
  items: PermissionAccordionItem[];
};

export function PermissionsAccordion({ items }: PermissionsAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  const handleToggle = useCallback(
    (id: string) => {
      setOpenId((current) => (current === id ? null : id));
    },
    [],
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="overflow-hidden border border-[#e6e8eb] bg-white">
        {items.map((item, index) => {
          const isOpen = item.id === openId;
          return (
            <div key={item.id} className={cn(index > 0 && "border-t border-[#e6e8eb]")}>
              <button
                type="button"
                onClick={() => handleToggle(item.id)}
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left text-[14px] font-semibold text-[#0a2540] transition hover:bg-[#f8fafc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#635bff] sm:gap-4 sm:px-4 sm:py-3.5"
                aria-expanded={isOpen}
                aria-controls={`${item.id}-content`}
                id={`${item.id}-trigger`}
              >
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 flex-shrink-0 text-[#94a3b8] transition-transform",
                    isOpen && "rotate-180",
                  )}
                  aria-hidden="true"
                />
                <span className="flex-1">{item.label}</span>
                {item.scope ? (
                  <span className="text-[13px] font-medium text-[#475569]">{item.scope}</span>
                ) : null}
              </button>
              <div
                id={`${item.id}-content`}
                role="region"
                aria-labelledby={`${item.id}-trigger`}
                className={cn("pl-6 pr-4 text-[14px] leading-[1.6] text-[#334155] sm:pl-8", isOpen ? "pb-4 pt-0" : "hidden")}
              >
                <div className="border-t border-[#e6e8eb] pt-4">
                  {item.description ?? ""}
                  {item.learnMoreUrl ? (
                    <div className="mt-2">
                      <a href={item.learnMoreUrl} target="_blank" rel="noreferrer" className="text-[13px] text-[#635bff] hover:underline">
                        Learn more
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
