import Link, { LinkProps } from "next/link";
import { PropsWithChildren } from "react";

type SmartLinkProps = PropsWithChildren<
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string;
    nextLinkProps?: Omit<LinkProps<string>, "href">;
  }
>;

export function SmartLink({
  href,
  children,
  nextLinkProps,
  className,
  ...rest
}: SmartLinkProps) {
  const isInternal = href.startsWith("/") || href.startsWith("#");

  if (isInternal) {
    return (
      <Link href={href as any} className={className} {...nextLinkProps}>
        {children}
      </Link>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      {...rest}
    >
      {children}
    </a>
  );
}
