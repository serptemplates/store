"use client";

import Image from "next/image";

import { Button } from "@repo/ui";
import { getCategoryBadgeClasses } from "@/components/category-badge";

type AppHeaderProps = {
  name: string;
  subtitle: string;
  categories?: string[];
  iconUrl?: string | null;
  iconInitials: string;
  onPrimaryAction?: () => void;
  primaryLabel: string;
};

export function AppHeader({
  name,
  subtitle,
  categories = [],
  iconUrl,
  iconInitials,
  onPrimaryAction,
  primaryLabel,
}: AppHeaderProps) {
  const topCategories = categories.slice(0, 3);
  return (
    <section className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr),200px] lg:grid-cols-[minmax(0,1fr),240px]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-4">
          <AppIcon iconUrl={iconUrl} initials={iconInitials} name={name} />
          <div className="flex flex-1 flex-col gap-2">
            <h1 className="text-[24px] font-semibold leading-[1.2] tracking-[-0.01em] text-[#0a2540] md:text-[28px] lg:text-[32px]">
              {name}
            </h1>
            <p className="text-[14px] leading-[1.6] text-[#425466] md:text-[15px]">
              {subtitle}
            </p>
            {topCategories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {topCategories.map((category) => {
                  const label = category.trim();
                  if (!label) {
                    return null;
                  }
                  return (
                    <span key={label} className={getCategoryBadgeClasses(label)}>
                      {label}
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-start md:flex-col md:items-end">
        <Button
          size="sm"
          className="h-10 w-full rounded-lg bg-[#635bff] px-4 text-[14px] font-medium text-white transition hover:bg-[#5752ff] sm:w-auto"
          onClick={onPrimaryAction}
        >
          {primaryLabel}
        </Button>
      </div>
    </section>
  );
}

type AppIconProps = {
  iconUrl?: string | null;
  initials: string;
  name: string;
};

function AppIcon({ iconUrl, initials, name }: AppIconProps) {
  const fallback = (
    <div
      className="flex h-16 w-16 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#1a237e] via-[#3949ab] to-[#8c9eff] text-lg font-semibold uppercase text-white"
      aria-hidden="true"
    >
      {initials}
    </div>
  );

  if (!iconUrl) {
    return fallback;
  }

  return (
    <div className="relative h-16 w-16 overflow-hidden rounded-[12px] bg-[#f4f6fb]">
      <Image src={iconUrl} alt={`${name} icon`} fill sizes="64px" className="object-cover" />
    </div>
  );
}
