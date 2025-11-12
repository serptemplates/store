"use client";

import { cn } from "../lib/utils";

type TrademarkDisclaimerProps = {
  text?: string | null;
  variant?: "card" | "inline";
  align?: "left" | "center" | "right";
  className?: string;
};

const ALIGNMENT_MAP: Record<NonNullable<TrademarkDisclaimerProps["align"]>, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export function TrademarkDisclaimer({ text, variant = "card", align = "center", className }: TrademarkDisclaimerProps) {
  const message = typeof text === "string" ? text.trim() : "";
  if (!message) {
    return null;
  }

  const sizeClasses = variant === "inline" ? "text-[11px]" : "text-sm";
  const toneClasses =
    variant === "card" ? "text-muted-foreground italic dark:text-muted-foreground" : "text-muted-foreground";
  const chromeClasses =
    variant === "card"
      ? "px-3 py-2"
      : "text-muted-foreground/90";
  const alignmentClasses = ALIGNMENT_MAP[align] ?? ALIGNMENT_MAP.center;
  const Element = variant === "card" ? "p" : "span";

  return (
    <Element className={cn("leading-relaxed", sizeClasses, toneClasses, chromeClasses, alignmentClasses, className)}>
      {message}
    </Element>
  );
}
