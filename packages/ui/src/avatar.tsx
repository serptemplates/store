import * as React from "react";
import { cn } from "./lib/utils";

export type AvatarProps = React.HTMLAttributes<HTMLDivElement> & {
  src?: string;
  alt?: string;
};

export function Avatar({ src, alt, className, children, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-muted text-foreground",
        className
      )}
      {...props}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt ?? ""} className="h-full w-full object-cover" />
      ) : (
        children
      )}
    </div>
  );
}

export type AvatarFallbackProps = React.HTMLAttributes<HTMLSpanElement>;
export function AvatarFallback({ className, children, ...props }: AvatarFallbackProps) {
  return (
    <span className={cn("text-sm font-medium", className)} {...props}>
      {children}
    </span>
  );
}

export default Avatar;

