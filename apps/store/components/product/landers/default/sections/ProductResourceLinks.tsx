import { ExternalLink } from "lucide-react";

type Link = {
  label: string;
  href: string;
};

type ProductResourceLinksProps = {
  title?: string;
  links: Link[];
};

export function ProductResourceLinks({ title = "Links", links }: ProductResourceLinksProps) {
  if (!Array.isArray(links) || links.length === 0) {
    return null;
  }

  return (
    <section className="bg-muted/40">
      <div className="container mx-auto max-w-4xl px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {links.map((link) => (
              <li key={`${link.label}-${link.href}`}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex w-full items-center justify-between rounded-lg border border-border/60 bg-background px-4 py-3 text-sm font-medium text-foreground shadow-sm transition hover:border-primary hover:text-primary"
                >
                  <span>{link.label}</span>
                  <ExternalLink
                    className="h-4 w-4 text-muted-foreground transition group-hover:text-primary"
                    aria-hidden="true"
                  />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default ProductResourceLinks;
