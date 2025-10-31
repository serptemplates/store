import { Fragment, type ReactNode } from "react";

import { ProductLinksRail } from "@/components/product/shared/ProductLinksRail";
import { formatOperatingSystemLabel, type ProductMetadata } from "@/lib/products/view-model";

export type MetadataRow = {
  label: string;
  value: ReactNode;
};

export type LegalLink = {
  label: string;
  href: string;
};

export function buildMetadataRows(metadataSource: ProductMetadata): MetadataRow[] {
  const { supportedLanguages, operatingSystems, resourceLinks } = metadataSource;
  const rows: MetadataRow[] = [];

  if (supportedLanguages.length > 0) {
    rows.push({
      label: "Supported languages",
      value: supportedLanguages.join(", "),
    });
  }

  if (operatingSystems.length > 0) {
    const formattedSystems = operatingSystems.map(formatOperatingSystemLabel);
    const osRows = chunkIntoLines(formattedSystems, 2);
    if (osRows.length > 0) {
      rows.push({
        label: "Compatibility",
        value: (
          <div className="flex flex-col gap-1">
            {osRows.map((line, index) => (
              <span key={`${line}-${index}`} className="text-[14px] leading-[1.6] text-[#334155]">
                {line}
              </span>
            ))}
          </div>
        ),
      });
    }
  }

  if (resourceLinks.length > 0) {
    rows.push({
      label: "Links",
      value: <ProductLinksRail links={resourceLinks} />,
    });
  }

  return rows;
}

export function MetadataList({ items, legalLinks }: { items: MetadataRow[]; legalLinks: LegalLink[] }) {
  const hasItems = items.length > 0;
  const hasLegalLinks = legalLinks.length > 0;

  return (
    <div className="space-y-6">
      {hasItems ? (
        <dl className="space-y-6">
          {items.map((item) => (
            <div key={item.label} className="flex flex-col gap-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#475569]">{item.label}</dt>
              <dd className="text-[14px] leading-[1.6] text-[#334155]">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {hasItems && hasLegalLinks ? <hr className="border-[#e6e8eb]" /> : null}

      {hasLegalLinks ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[12px] font-medium text-[#635bff]">
          {legalLinks.map((link, index) => (
            <Fragment key={link.label}>
              {index > 0 && <span className="text-[#475569]">/</span>}
              <a href={link.href} target="_blank" rel="noreferrer" className="hover:underline">
                {link.label}
              </a>
            </Fragment>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function chunkIntoLines(values: string[], perLine: number): string[] {
  const lines: string[] = [];
  for (let index = 0; index < values.length; index += perLine) {
    const slice = values.slice(index, index + perLine);
    lines.push(slice.join(", "));
  }
  return lines;
}
