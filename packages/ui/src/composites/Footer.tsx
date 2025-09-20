export type FooterSite = {
  name: string;
};

export type FooterProps = {
  site: FooterSite;
  year?: number;
};

export function Footer({ site, year = new Date().getFullYear() }: FooterProps) {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-8">
        <div className="flex flex-col items-center gap-4 text-center text-sm text-muted-foreground md:flex-row md:justify-between">
          <p>© {year} {site.name}. All rights reserved.</p>
          <nav aria-label="Legal">
            <ul className="flex flex-wrap justify-center gap-4">
              <li>
                <a className="hover:text-primary" href="/privacy">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a className="hover:text-primary" href="/terms">
                  Terms of Service
                </a>
              </li>
              <li>
                <a className="hover:text-primary" href="/dmca">
                  DMCA
                </a>
              </li>
              <li>
                <a className="hover:text-primary" href="/contact">
                  Contact
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
