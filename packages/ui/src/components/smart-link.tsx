import Link, { LinkProps } from "next/link";
import type { Route } from "next";
import { PropsWithChildren } from "react";

type SmartLinkProps = PropsWithChildren<
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string;
    nextLinkProps?: Omit<LinkProps<string>, "href">;
    "data-testid"?: string;
  }
>;

const INTERNAL_HOSTS = new Set([
  "apps.serp.co",
  "store.serp.co",
]);

function normalizeInternalHref(rawHref: string): string | null {
  if (!rawHref) {
    return null;
  }

  if (rawHref.startsWith("/")) {
    return rawHref;
  }

  if (rawHref.startsWith("#")) {
    return rawHref;
  }

  if (!rawHref.startsWith("http://") && !rawHref.startsWith("https://")) {
    return null;
  }

  try {
    const url = new URL(rawHref);
    if (!INTERNAL_HOSTS.has(url.hostname)) {
      return null;
    }
    const normalizedPath = url.pathname || "/";
    return `${normalizedPath}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

const SmartLink = ({
  href,
  children,
  nextLinkProps,
  className,
  onClick,
  "data-testid": dataTestId,
  ...rest
}: SmartLinkProps) => {
  const normalized = normalizeInternalHref(href);

  if (normalized && normalized.startsWith("/")) {
    return (
      <Link
        href={normalized as Route}
        className={className}
        onClick={onClick}
        data-testid={dataTestId}
        {...nextLinkProps}
      >
        {children}
      </Link>
    );
  }

  if (normalized && normalized.startsWith("#")) {
    return (
      <a
        href={normalized}
        className={className}
        onClick={onClick}
        data-testid={dataTestId}
        {...rest}
      >
        {children}
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={onClick}
      data-testid={dataTestId}
      {...rest}
    >
      {children}
    </a>
  );
};

export default SmartLink;
