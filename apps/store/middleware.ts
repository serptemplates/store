import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ROUTES } from "@/lib/routes";

// Define redirect mappings from old GHL store URLs to new URLs
const REDIRECT_MAPPINGS: Record<string, string> = {
  // Old GHL store URLs -> New store URLs
  "/store/product-1": "/loom-video-downloader",
  "/store/product-2": "/youtube-downloader",
  "/ghl/checkout": ROUTES.checkoutRoot,
  "/ghl/success": ROUTES.checkoutSuccess,

  // Add more mappings as needed
  "/old-product-url": "/new-product-slug",
  "/legacy/store": "/",

  // Category redirects
  "/category/downloaders": "/",
  "/category/tools": "/",

  // Common GHL paths
  "/funnel/*": "/", // Redirect all funnel pages to home for now
  "/v2/*": "/", // Old version paths
};

// Regex patterns for dynamic redirects
const DYNAMIC_REDIRECTS = [
  {
    // Redirect GHL funnel URLs with IDs
    pattern: /^\/funnels\/([a-zA-Z0-9]+)\/pages\/([a-zA-Z0-9]+)$/,
    redirect: (match: RegExpMatchArray) => `/product/${match[1]}`,
  },
  {
    // Redirect old product URLs with query params
    pattern: /^\/products\?id=([a-zA-Z0-9-]+)$/,
    redirect: (match: RegExpMatchArray) => `/${match[1]}`,
  },
];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const fullPath = `${pathname}${search}`;

  // Check static redirects first
  if (REDIRECT_MAPPINGS[pathname]) {
    return NextResponse.redirect(
      new URL(REDIRECT_MAPPINGS[pathname], request.url),
      301 // Permanent redirect
    );
  }

  // Check wildcard redirects
  for (const [pattern, target] of Object.entries(REDIRECT_MAPPINGS)) {
    if (pattern.endsWith("/*")) {
      const basePath = pattern.slice(0, -2);
      if (pathname.startsWith(basePath)) {
        return NextResponse.redirect(
          new URL(target, request.url),
          301
        );
      }
    }
  }

  // Check dynamic redirects
  for (const { pattern, redirect } of DYNAMIC_REDIRECTS) {
    const match = fullPath.match(pattern);
    if (match) {
      const targetPath = redirect(match);
      return NextResponse.redirect(
        new URL(targetPath, request.url),
        301
      );
    }
  }

  // UTM parameter preservation for marketing campaigns
  if (
    search.includes("utm_") ||
    search.includes("ref=") ||
    search.includes("affiliateId=") ||
    search.includes("aff=") ||
    search.includes("am_id=") ||
    search.includes("via=")
  ) {
    // Preserve UTM parameters when redirecting
    // Store UTM parameters in cookies for attribution tracking
    const response = NextResponse.next();
    const searchParams = new URLSearchParams(search);

    // Set cookies for tracking (30 day expiry)
    const host = request.headers.get("host") ?? "";
    const domain = host.endsWith(".serp.co") ? ".serp.co" : undefined;
    const cookieOptions = {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: false,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      ...(domain ? { domain } : {}),
    };

    if (searchParams.get('utm_source')) {
      response.cookies.set('utm_source', searchParams.get('utm_source')!, cookieOptions);
    }
    if (searchParams.get('utm_medium')) {
      response.cookies.set('utm_medium', searchParams.get('utm_medium')!, cookieOptions);
    }
    if (searchParams.get('utm_campaign')) {
      response.cookies.set('utm_campaign', searchParams.get('utm_campaign')!, cookieOptions);
    }
    if (searchParams.get('utm_term')) {
      response.cookies.set('utm_term', searchParams.get('utm_term')!, cookieOptions);
    }
    if (searchParams.get('utm_content')) {
      response.cookies.set('utm_content', searchParams.get('utm_content')!, cookieOptions);
    }
    const affiliateParam =
      searchParams.get('aff') ||
      searchParams.get('affiliate') ||
      searchParams.get('affiliateId') ||
      searchParams.get('ref') ||
      searchParams.get('am_id') ||
      searchParams.get('via');

    if (affiliateParam) {
      const normalizedAffiliate = affiliateParam.trim();
      if (normalizedAffiliate) {
        response.cookies.set('affiliateId', normalizedAffiliate, cookieOptions);
      }
    }

    const viaParam = searchParams.get("via");
    if (viaParam && viaParam.trim()) {
      const normalizedVia = viaParam.trim();
      const normalizedDubId = normalizedVia.startsWith("dub_id_")
        ? normalizedVia
        : `dub_id_${normalizedVia}`;
      const currentDubId = request.cookies.get("dub_id")?.value ?? "";
      if (!currentDubId) {
        response.cookies.set("dub_id", normalizedDubId, cookieOptions);
      }

      const currentPartnerData = request.cookies.get("dub_partner_data")?.value ?? "";
      if (!currentPartnerData) {
        const partnerData = JSON.stringify({ via: normalizedVia });
        response.cookies.set("dub_partner_data", partnerData, cookieOptions);
      }
    }

    return response;
  }

  // Log 404s from old URLs for monitoring
  if (pathname.includes('/ghl/') || pathname.includes('/funnel/') || pathname.includes('/store/')) {
    console.warn(`[301-redirect] Old URL accessed but no redirect configured: ${fullPath}`);
  }

  // For all other unmatched paths that look like they should be 404s,
  // redirect to homepage with a 301 status
  // This will catch any path that doesn't match existing routes
  // Note: In production, Next.js will handle actual 404 detection,
  // but we can add a catch-all for common 404 patterns
  const is404Pattern =
    pathname.length > 1 && // Not the homepage
    !pathname.startsWith('/blog') && // Not blog pages
    !pathname.startsWith('/checkout') && // Not checkout pages
    !pathname.startsWith('/account') && // Allow account pages
    !pathname.startsWith('/categories') && // Allow category listings and sitemap
    !pathname.startsWith('/watch') && // Allow dedicated watch pages
    !pathname.match(/^\/[a-z0-9-]+$/) && // Not product pages (single segment slugs)
    !pathname.includes('.'); // Not static files

  if (is404Pattern) {
    console.log(`[404-redirect] Redirecting unknown path to homepage: ${pathname}`);
    return NextResponse.redirect(new URL('/', request.url), 301);
  }

  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)',
  ],
};
