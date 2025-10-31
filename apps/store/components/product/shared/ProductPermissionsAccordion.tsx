"use client";

import type { ComponentProps } from "react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@repo/ui/lib/utils";

export type ProductPermissionItem = {
  id: string;
  title: string;
  description: string;
  learnMoreUrl?: string;
};

type ProductPermissionsAccordionProps = {
  items?: ProductPermissionItem[];
  className?: string;
  heading?: string | null;
  description?: string | null;
  accordionProps?: Omit<ComponentProps<typeof Accordion>, "type" | "collapsible" | "defaultValue" | "children">;
  wrapWithContainer?: boolean;
};

export function ProductPermissionsAccordion({
  items,
  className,
  heading = "Permissions",
  description = "",
  accordionProps,
  wrapWithContainer = true,
}: ProductPermissionsAccordionProps) {
  const entries = Array.isArray(items) ? items.filter((item) => item.title && item.description) : [];

  if (entries.length === 0) {
    return null;
  }

  const header =
    heading || description ? (
      <div className="mb-6 space-y-3 text-center sm:text-left">
        {heading ? (
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{heading}</h2>
        ) : null}
        {description ? <p className="text-base text-muted-foreground">{description}</p> : null}
      </div>
    ) : null;

  const accordion = (
    <Accordion
      type="single"
      collapsible
      className="w-full divide-y divide-border rounded-xl border border-border bg-card"
      defaultValue={entries[0]?.id}
      {...accordionProps}
    >
      {entries.map((entry) => {
        const paragraphs = entry.description
          .split(/\n{2,}/)
          .map((segment) => segment.trim())
          .filter((segment) => segment.length > 0);

        return (
          <AccordionItem key={entry.id} value={entry.id} className="border-0 px-2 first:rounded-t-xl last:rounded-b-xl">
            <AccordionTrigger className="text-left text-lg font-medium text-foreground">
              {entry.title}
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-5 text-base leading-relaxed">
              <div className="flex flex-col gap-4">
                {paragraphs.map((segment, index) => (
                  <p key={index} className="whitespace-pre-line text-muted-foreground">
                    {segment}
                  </p>
                ))}
                {entry.learnMoreUrl ? (
                  <a
                    href={entry.learnMoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary underline underline-offset-4"
                  >
                    Learn more
                    <span aria-hidden className="text-base">↗</span>
                  </a>
                ) : null}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );

  if (!wrapWithContainer) {
    return (
      <section className={className} aria-labelledby="product-permissions">
        {header}
        {accordion}
      </section>
    );
  }

  return (
    <section className={cn("container mx-auto my-16 max-w-4xl px-4", className)} aria-labelledby="product-permissions">
      {header}
      {accordion}
    </section>
  );
}
