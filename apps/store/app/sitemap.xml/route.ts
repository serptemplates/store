import { NextResponse } from "next/server";

export function GET(request: Request): NextResponse {
  const url = new URL(request.url);
  url.pathname = "/sitemap-index.xml";
  url.search = "";
  url.hash = "";

  return NextResponse.redirect(url);
}
