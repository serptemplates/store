"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { ArrowRight } from "lucide-react";

export type InteractiveHoverButtonProps = {
  text?: string;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function InteractiveHoverButton({ text = "Get It Now", className, children, ...props }: InteractiveHoverButtonProps) {
  const content = children ?? text;
  return (
    <button
      className={cn(
        "group inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold",
        "bg-background text-foreground ring-1 ring-border shadow-sm",
        "transition-all duration-300",
        // hover fills to dark/foreground and inverts text
        "hover:bg-foreground hover:text-background",
        className,
      )}
      {...props}
    >
      {/* left black dot (inverts on hover) */}
      <span className={cn("h-2.5 w-2.5 rounded-full bg-foreground transition-colors group-hover:bg-background")} />
      <span>{content}</span>
      {/* arrow slides in on hover */}
      <span className={cn("inline-flex overflow-hidden transition-all", "w-0 -translate-x-1 opacity-0 group-hover:w-5 group-hover:translate-x-0 group-hover:opacity-100")}
        aria-hidden
      >
        <ArrowRight className="h-4 w-4" />
      </span>
    </button>
  );
}

export default InteractiveHoverButton;
