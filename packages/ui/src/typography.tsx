import * as React from "react"

import { cn } from "./lib/utils"

export function TypographyH1({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "scroll-m-20 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl",
        className,
      )}
      {...props}
    />
  )
}

export function TypographyH2({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "scroll-m-16 text-3xl font-semibold tracking-tight text-gray-900 md:text-4xl",
        className,
      )}
      {...props}
    />
  )
}

export function TypographyH3({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("scroll-m-14 text-2xl font-semibold tracking-tight text-gray-900", className)}
      {...props}
    />
  )
}

export function TypographyH4({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h4
      className={cn("scroll-m-12 text-xl font-medium tracking-tight text-gray-900", className)}
      {...props}
    />
  )
}

export function TypographyP({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-base leading-7 text-gray-700 [&:not(:first-child)]:mt-6", className)}
      {...props}
    />
  )
}

export function TypographyLead({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-lg leading-relaxed text-gray-700", className)}
      {...props}
    />
  )
}

export function TypographyLarge({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-base font-semibold text-gray-900", className)}
      {...props}
    />
  )
}

export function TypographySmall({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-gray-600", className)}
      {...props}
    />
  )
}

export function TypographyMuted({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-gray-500", className)}
      {...props}
    />
  )
}
