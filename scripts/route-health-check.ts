#!/usr/bin/env tsx
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { LinkChecker } from "linkinator";
import siteMapCrawler from "sitemap-crawler";
import { XMLParser } from "fast-xml-parser";

const DEFAULT_BASE_URL = "http://localhost:3000";
const DEFAULT_CONCURRENCY = 8;
const BASE_URL = (process.env.ROUTE_HEALTH_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
const SITEMAP_URL =
  process.env.ROUTE_HEALTH_SITEMAP_URL || `${BASE_URL}/apps-sitemap.xml`;
const LINKINATOR_CONCURRENCY = Number(process.env.ROUTE_HEALTH_LINKINATOR_CONCURRENCY || "20");
const SITEMAP_CONCURRENCY = Number(
  process.env.ROUTE_HEALTH_SITEMAP_CONCURRENCY || `${DEFAULT_CONCURRENCY}`,
);
const ALLOWED_REDIRECTS = new Set([301, 302, 303, 307, 308]);
const PARSER = new XMLParser({ ignoreAttributes: false });

async function runLinkinator(): Promise<void> {
  const checker = new LinkChecker();
  const origin = new URL(BASE_URL).origin;
  const skipPatterns = [
    /^mailto:/,
    /^tel:/,
    /^sms:/,
    /\.svg$/,
    /\.ico$/,
    /^https?:\/\/[^/]+\/_next\/image/,
  ];

  const result = await checker.check({
    path: BASE_URL,
    recurse: true,
    timeout: Number(process.env.ROUTE_HEALTH_TIMEOUT || "60000"),
    concurrency: LINKINATOR_CONCURRENCY,
    skip: skipPatterns,
  });

  const internalFailures = result.links.filter((link) => {
    if (!link.url.startsWith(origin)) return false;
    if (link.url.includes("/_next/image")) return false;
    if (link.state === "OK") return false;
    if (typeof link.status === "number" && link.status < 400) return false;
    return true;
  });

  if (internalFailures.length > 0) {
    const details = internalFailures
      .map((link) => `  • ${link.status ?? "?"} ${link.url}`)
      .join("\n");
    throw new Error(
      `Linkinator crawl found ${internalFailures.length} failing internal URLs:\n${details}`,
    );
  }
}

async function fetchXml(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch sitemap ${url}: ${res.status}`);
  }
  const text = await res.text();
  return PARSER.parse(text);
}

async function gatherSitemapUrls(url: string, seen = new Set<string>()): Promise<string[]> {
  if (seen.has(url)) {
    return [];
  }
  seen.add(url);
  const parsed = await fetchXml(url);
  if (parsed && typeof parsed === "object" && "sitemapindex" in parsed) {
    const entries = (parsed as any).sitemapindex.sitemap;
    const list = Array.isArray(entries) ? entries : [entries];
    const nested = await Promise.all(
      list.map((entry) => gatherSitemapUrls(entry.loc as string, seen)),
    );
    return nested.flat();
  }
  if (parsed && typeof parsed === "object" && "urlset" in parsed) {
    const urls = (parsed as any).urlset.url;
    const list = Array.isArray(urls) ? urls : [urls];
    return list.map((entry) => entry.loc as string);
  }
  throw new Error(`Unsupported sitemap format from ${url}`);
}

async function warmSitemapWithCrawler(urls: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    siteMapCrawler(
      urls,
      { isProgress: false, isLog: process.env.ROUTE_HEALTH_VERBOSE === "1" },
      (err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      },
    );
  });
}

async function verifySitemapUrls(urls: string[]): Promise<void> {
  const failures: { url: string; status?: number; message?: string }[] = [];
  const queue = [...urls];

  async function worker() {
    while (queue.length > 0) {
      const target = queue.shift();
      if (!target) return;
      try {
        const res = await fetch(target, { redirect: "manual" });
        if (!res.ok && !ALLOWED_REDIRECTS.has(res.status)) {
          failures.push({ url: target, status: res.status });
        }
      } catch (error) {
        failures.push({
          url: target,
          message: error instanceof Error ? error.message : String(error),
        });
      }
      await delay(10);
    }
  }

  await Promise.all([...Array(SITEMAP_CONCURRENCY)].map(() => worker()));

  if (failures.length > 0) {
    const details = failures
      .map((entry) => `  • ${entry.status ?? "ERR"} ${entry.url}${entry.message ? ` (${entry.message})` : ""}`)
      .join("\n");
    throw new Error(`Sitemap validation failed for ${failures.length} URLs:\n${details}`);
  }
}

async function main() {
  console.log(`🔍 Linkinator crawl → ${BASE_URL}`);
  await runLinkinator();
  console.log("✅ Linkinator passed");

  console.log(`🔍 Collecting sitemap URLs from ${SITEMAP_URL}`);
  const urls = Array.from(new Set(await gatherSitemapUrls(SITEMAP_URL)));
  console.log(`   • Found ${urls.length} URLs`);

  if (urls.length === 0) {
    throw new Error("Sitemap returned zero URLs");
  }

  console.log("🔍 Touching sitemap URLs with sitemap-crawler (to catch orphaned pages)");
  await warmSitemapWithCrawler(urls);
  console.log("   • sitemap-crawler completed");

  console.log("🔍 Verifying sitemap URLs return < 400");
  await verifySitemapUrls(urls);
  console.log("✅ Sitemap URLs are healthy");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
