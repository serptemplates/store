import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import Image from "next/image";
import { isValidElement } from "react";
import { CodeBlock } from "./code-block";

export const mdxComponents: MDXComponents = {
  a: ({ href, children, ...props }: any) => {
    if (href?.startsWith("/")) {
      return (
        <Link href={href} {...props}>
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
  Image: (props: any) => <Image alt="" {...props} />,
  img: ({ src, alt, ...props }: any) => {
    if (!src) return null;
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
  pre: ({ children, ...props }: any) => {
    // Extract language from code block if available
    let languageValue = "";
    let codeString = "";

    if (children && isValidElement(children)) {
      const childProps = children.props as any;
      if (childProps?.className) {
        const match = childProps.className.match(/language-(\w+)/);
        if (match) {
          languageValue = match[1];
        }
      }
      codeString = childProps?.children || "";
    }

    return (
      <CodeBlock language={languageValue} codeString={codeString} {...props}>
        {children}
      </CodeBlock>
    );
  },
  code: ({ children, className, ...props }: any) => {
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
  blockquote: ({ children, ...props }: any) => (
    <blockquote className="my-6 border-l-4 border-primary/50 bg-gray-50 py-4 pl-6 pr-4 italic text-gray-700 dark:bg-gray-900 dark:text-gray-300" {...props}>
      {children}
    </blockquote>
  ),
  h1: ({ children, ...props }: any) => (
    <h1 className="mb-4 text-3xl font-bold tracking-tight" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: any) => (
    <h2 className="mb-3 mt-8 text-2xl font-bold tracking-tight" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: any) => (
    <h3 className="mb-2 mt-6 text-xl font-semibold tracking-tight" {...props}>
      {children}
    </h3>
  ),
  ul: ({ children, ...props }: any) => (
    <ul className="mb-6 list-disc pl-6 space-y-2" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: any) => (
    <ol className="mb-6 list-decimal pl-6 space-y-2" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: any) => (
    <li className="leading-relaxed" {...props}>
      {children}
    </li>
  ),
  p: ({ children, ...props }: any) => (
    <p className="mb-6 leading-7 text-gray-700 dark:text-gray-300" {...props}>
      {children}
    </p>
  ),
  iframe: ({ title, ...props }: any) => (
    <div className="my-8 aspect-video w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
      <iframe className="h-full w-full" title={title ?? "embedded-content"} {...props} />
    </div>
  ),
  table: ({ children, ...props }: any) => (
    <div className="my-6 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
      <table className="w-full text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }: any) => (
    <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }: any) => (
    <tbody className="divide-y divide-gray-200 dark:divide-gray-800" {...props}>
      {children}
    </tbody>
  ),
  tr: ({ children, ...props }: any) => (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-900" {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }: any) => (
    <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-gray-100" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: any) => (
    <td className="px-4 py-2 text-gray-700 dark:text-gray-300" {...props}>
      {children}
    </td>
  ),
  hr: (props: any) => (
    <hr className="my-8 border-gray-200 dark:border-gray-800" {...props} />
  ),
  strong: ({ children, ...props }: any) => (
    <strong className="font-semibold text-gray-900 dark:text-gray-100" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }: any) => (
    <em className="italic text-gray-800 dark:text-gray-200" {...props}>
      {children}
    </em>
  ),
};
