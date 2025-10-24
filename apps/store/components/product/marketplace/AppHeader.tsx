"use client";

import Image from "next/image";

import { Button } from "@repo/ui";

type AppHeaderProps = {
  name: string;
  subtitle: string;
  category?: string;
  iconUrl?: string | null;
  iconInitials: string;
  onPrimaryAction?: () => void;
  primaryLabel: string;
};

export function AppHeader({
  name,
  subtitle,
  category = "Payment gateways",
  iconUrl,
  iconInitials,
  onPrimaryAction,
  primaryLabel,
}: AppHeaderProps) {
  return (
    <section className="grid justify-items-center gap-6 md:justify-items-start md:grid-cols-[minmax(0,1fr),200px] lg:grid-cols-[minmax(0,1fr),240px]">
      <div className="flex w-full max-w-2xl flex-col gap-4">
        <div className="flex flex-col items-center gap-4 md:flex-row md:items-start md:gap-4">
          <AppIcon iconUrl={iconUrl} initials={iconInitials} name={name} />
          <div className="flex flex-1 flex-col gap-2 text-center md:text-left">
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.01em] text-[#0a2540] sm:text-[28px] lg:text-[32px]">
              {name}
            </h1>
            <p className="max-w-xl text-[15px] leading-[1.6] text-[#425466] md:max-w-none">
              {subtitle}
            </p>
            
          </div>
        </div>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2 sm:flex-row sm:items-center sm:justify-center md:max-w-none md:flex-col md:items-end">
        <Button
          size="sm"
          className="h-11 w-full rounded-lg bg-[#635bff] px-4 text-[16px] font-medium text-white transition hover:bg-[#5752ff] sm:w-auto"
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
      className="flex h-14 w-14 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#1a237e] via-[#3949ab] to-[#8c9eff] text-base font-semibold uppercase text-white md:h-16 md:w-16 md:text-lg"
      aria-hidden="true"
    >
      {initials}
    </div>
  );

  if (!iconUrl) {
    return fallback;
  }

  return (
    <div className="relative h-14 w-14 overflow-hidden rounded-[12px] bg-[#f4f6fb] md:h-16 md:w-16">
      <Image src={iconUrl} alt={`${name} icon`} fill sizes="64px" className="object-cover" />
    </div>
  );
}
