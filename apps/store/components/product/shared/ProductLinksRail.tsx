import { ExternalLink } from "lucide-react";

import { cn } from "@repo/ui/lib/utils";

export type ProductLinkItem = {
  label: string;
  href: string;
};

type ProductLinksRailProps = {
  links: ProductLinkItem[];
  className?: string;
  variant?: "stacked" | "inline";
};

export function ProductLinksRail({ links, className, variant = "stacked" }: ProductLinksRailProps) {
  if (!Array.isArray(links) || links.length === 0) {
    return null;
  }

  const layoutClasses =
    variant === "inline"
      ? "flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-[#635bff]"
      : "flex flex-col gap-1";

  return (
    <div className={cn(layoutClasses, className)}>
      {links.map((link) => (
        <a
          key={link.href}
          className="inline-flex items-center gap-1 text-[#635bff] transition hover:underline"
          href={link.href}
          target="_blank"
          rel="noreferrer"
        >
          {link.label}
          <ExternalLink className="h-3 w-3 text-[#94a3b8]" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}
