"use client";

import type { ComponentProps } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@repo/ui/lib/utils";

type PermissionJustification = {
  permission: string;
  justification: string;
  learn_more_url?: string;
};

type PermissionJustificationsAccordionProps = {
  items?: PermissionJustification[];
  className?: string;
  heading?: string;
  description?: string;
  accordionProps?: Omit<ComponentProps<typeof Accordion>, "type" | "collapsible" | "defaultValue" | "children">;
};

export function PermissionsJustificationAccordion({
  items,
  className,
  heading = "Permission Justifications ",
  description = "",
  accordionProps,
}: PermissionJustificationsAccordionProps) {
  const entries =
    items
      ?.map((entry) => ({
        ...entry,
        permission: entry.permission?.trim() ?? "",
        justification: entry.justification?.trim() ?? "",
      }))
      .filter((entry) => entry.permission.length > 0 && entry.justification.length > 0) ?? [];

  if (entries.length === 0) {
    return null;
  }

  return (
    <section className={cn("container mx-auto my-16 max-w-4xl px-4", className)} aria-labelledby="permissions-heading">
      <div className="mb-6 space-y-2 text">
          <h2 className="mb-16 text-center text-2xl md:text-3xl font-bold text-gray-900">
          Permissions
        </h2>
        {description ? (
          <p className="text-base">
            {description}
          </p>
        ) : null}
      </div>

      <Accordion
        type="single"
        collapsible
        className="w-full divide-y divide-border rounded-xl border border-border bg-card"
        {...accordionProps}
      >
        {entries.map((entry, index) => {
          const value = `permission-${index}`;
          const paragraphs = entry.justification
            .split(/\n{2,}/)
            .map((segment) => segment.trim())
            .filter((segment) => segment.length > 0);
          return (
            <AccordionItem key={value} value={value} className="border-0 px-2 first:rounded-t-xl last:rounded-b-xl">
              <AccordionTrigger className="text-lg font-medium text-foreground">
                {entry.permission}
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-5 text-base leading-relaxed">
                <div className="flex flex-col gap-4">
                  {paragraphs.map((segment, segmentIndex) => (
                    <p key={segmentIndex} className="whitespace-pre-line text-md">
                      {segment}
                    </p>
                  ))}
                  {entry.learn_more_url ? (
                    <a
                      href={entry.learn_more_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary underline underline-offset-4"
                    >
                      Learn more
                      <span aria-hidden className="text-base">
                        ↗
                      </span>
                    </a>
                  ) : null}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </section>
  );
}

export default PermissionsJustificationAccordion;
