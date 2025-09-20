import Link from "next/link";
import { siteConfig } from "@/site.config";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-5">
          <div>
            <h3 className="mb-4 text-lg font-semibold">{siteConfig.name}</h3>
            <p className="text-sm text-muted-foreground">
              {siteConfig.description}
            </p>
          </div>
          
          <div>
            <h4 className="mb-4 text-sm font-semibold">Download Formats</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>MP4 Video</li>
              <li>WebM Video</li>
              <li>MP3 Audio</li>
              <li>Transcripts</li>
            </ul>
          </div>
          
          <div>
            <h4 className="mb-4 text-sm font-semibold">Platforms</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Windows</li>
              <li>Mac</li>
              <li>Linux</li>
              <li>Mobile</li>
            </ul>
          </div>
          
          <div>
            <h4 className="mb-4 text-sm font-semibold">Tools</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="https://getlooma.com" className="hover:text-primary" target="_blank" rel="noopener noreferrer">Get Looma</a></li>
              <li><a href="https://serpdownloaders.github.io" className="hover:text-primary" target="_blank" rel="noopener noreferrer">SERP Downloaders</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="mb-4 text-sm font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-primary">Terms of Service</Link></li>
              <li><Link href="/dmca" className="hover:text-primary">DMCA</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <a href="https://serp.co">© SERP</a>
        </div>
      </div>
    </footer>
  );
}

