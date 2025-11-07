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

const SmartLink = ({
  href,
  children,
  nextLinkProps,
  className,
  onClick,
  "data-testid": dataTestId,
  ...rest
}: SmartLinkProps) => {
  const isInternal = href.startsWith("/") || href.startsWith("#");

  if (isInternal) {
    return (
      <Link 
        href={href as Route} 
        className={className} 
        onClick={onClick}
        data-testid={dataTestId}
        {...nextLinkProps}
      >
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
      onClick={onClick}
      data-testid={dataTestId}
      {...rest}
    >
      {children}
    </a>
  );
};

export default SmartLink;
