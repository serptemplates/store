"use client";

import { cn } from "@repo/ui/lib/utils";

type MarketplaceLayoutProps = {
  header: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export function MarketplaceLayout({
  header,
  children,
  footer,
  className,
}: MarketplaceLayoutProps) {
  return (
    <div
      className={cn("min-h-screen bg-white text-[#0a2540]", className)}
      style={{ fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}
    >
      <div className="bg-[#f6f9fc]">
        <main className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <div className="px-6 py-6 sm:px-8 sm:py-8">{header}</div>
        </main>
      </div>
      <main className="mx-auto w-full max-w-[1200px] px-4 pb-20 sm:px-6 lg:px-10 lg:pb-24">
        <div className="mt-12 lg:mt-16">{children}</div>
      </main>

      {footer ? footer : null}
    </div>
  );
}
