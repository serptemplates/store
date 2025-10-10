import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import type {
  AnchorHTMLAttributes,
  HTMLAttributes,
  IframeHTMLAttributes,
  ImgHTMLAttributes,
  ReactElement,
} from "react";
import { isValidElement } from "react";
import type { ImageProps } from "next/image";
import { CodeBlock } from "./code-block";

export const mdxComponents: MDXComponents = {
  a: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => {
    if (href?.startsWith("/")) {
      return (
        <Link href={href as Route} {...props}>
          {children}
        </Link>
      );
    }
    if (href?.startsWith("#")) {
      return (
        <a href={href} {...props}>
          {children}
        </a>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
  Image: ({ alt, ...props }: ImageProps) => <Image alt={alt} {...props} />,
  img: ({ src, alt, width: _width, height: _height, ...props }: ImgHTMLAttributes<HTMLImageElement>) => {
    if (typeof src !== "string") return null;
    return (
      <Image
        src={src}
        alt={alt || ""}
        width={800}
        height={450}
        className="rounded-lg"
        {...props}
      />
    );
  },
  pre: ({ children, ...props }: HTMLAttributes<HTMLPreElement>) => {
    // Extract language from code block if available
    let languageValue = "";
    let codeString = "";

    if (children && isValidElement(children)) {
      const childElement = children as ReactElement<{ className?: string; children?: string }>;
      if (childElement.props?.className) {
        const match = childElement.props.className.match(/language-(\w+)/);
        if (match) {
          languageValue = match[1];
        }
      }
      codeString = childElement.props?.children ?? "";
    }

    return (
      <CodeBlock language={languageValue} codeString={codeString} {...props}>
        {children}
      </CodeBlock>
    );
  },
  code: ({ children, className, ...props }: HTMLAttributes<HTMLElement>) => {
    // Check if this is inline code or part of a code block
    const isInline = !className || !className.includes("language-");

    if (isInline) {
      return (
        <code className="rounded-md bg-gray-100 px-1.5 py-0.5 text-sm font-mono text-gray-800 dark:bg-gray-800 dark:text-gray-200" {...props}>
          {children}
        </code>
      );
    }

    // For code blocks, apply syntax highlighting colors
    return (
      <code className={`block font-mono text-sm leading-relaxed text-gray-100 ${className || ""}`} {...props}>
        {children}
      </code>
    );
  },
  blockquote: ({ children, ...props }: HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="my-6 border-l-4 border-primary/50 bg-gray-50 py-4 pl-6 pr-4 italic text-gray-700 dark:bg-gray-900 dark:text-gray-300" {...props}>
      {children}
    </blockquote>
  ),
  h1: ({ children, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="mb-4 text-3xl font-bold tracking-tight" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="mb-3 mt-8 text-2xl font-bold tracking-tight" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mb-2 mt-6 text-xl font-semibold tracking-tight" {...props}>
      {children}
    </h3>
  ),
  ul: ({ children, ...props }: HTMLAttributes<HTMLUListElement>) => (
    <ul className="mb-6 list-disc pl-6 space-y-2" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: HTMLAttributes<HTMLOListElement>) => (
    <ol className="mb-6 list-decimal pl-6 space-y-2" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: HTMLAttributes<HTMLLIElement>) => (
    <li className="leading-relaxed" {...props}>
      {children}
    </li>
  ),
  p: ({ children, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-6 leading-7 text-gray-700 dark:text-gray-300" {...props}>
      {children}
    </p>
  ),
  iframe: ({ title, ...props }: IframeHTMLAttributes<HTMLIFrameElement>) => (
    <div className="my-8 aspect-video w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
      <iframe className="h-full w-full" title={title ?? "embedded-content"} {...props} />
    </div>
  ),
  table: ({ children, ...props }: HTMLAttributes<HTMLTableElement>) => (
    <div className="my-6 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
      <table className="w-full text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }: HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }: HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody className="divide-y divide-gray-200 dark:divide-gray-800" {...props}>
      {children}
    </tbody>
  ),
  tr: ({ children, ...props }: HTMLAttributes<HTMLTableRowElement>) => (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-900" {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }: HTMLAttributes<HTMLTableHeaderCellElement>) => (
    <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-gray-100" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: HTMLAttributes<HTMLTableCellElement>) => (
    <td className="px-4 py-2 text-gray-700 dark:text-gray-300" {...props}>
      {children}
    </td>
  ),
  hr: (props: HTMLAttributes<HTMLHRElement>) => (
    <hr className="my-8 border-gray-200 dark:border-gray-800" {...props} />
  ),
  strong: ({ children, ...props }: HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-gray-900 dark:text-gray-100" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }: HTMLAttributes<HTMLElement>) => (
    <em className="italic text-gray-800 dark:text-gray-200" {...props}>
      {children}
    </em>
  ),
};
