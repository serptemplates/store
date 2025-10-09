"use client";

import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle,
  Download,
  MessageCircle,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { useSearchParams } from "next/navigation";

import { Button } from "@repo/ui";

import { processCheckoutSession } from "./actions";
import { ConversionTracking } from "./tracking";

type CheckoutVariant = "stripe" | "paypal" | "external";

type CtaDefinition = {
  label: string;
  href: Route | string;
  variant?: "default" | "outline";
  icon?: ComponentType<{ className?: string }>;
};

type HeroCopy = {
  title: string;
  description: string;
  ctas: CtaDefinition[];
};

type ResourceLink = {
  title: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

type WhitelistGuide = {
  title: string;
  mediaSrc?: string;
  alt?: string;
};

const HERO_COPY: Record<CheckoutVariant, HeroCopy> = {
  stripe: {
    title: "Thank you for your purchase!",
    description:
      "Your order is confirmed. We’ve sent a receipt and verification email to the address you used at checkout. It should arrive shortly.",
    ctas: [
      { label: "Open Your Account", href: "/account" },
      { label: "Need Help?", href: "/support", variant: "outline" },
    ],
  },
  paypal: {
    title: "Thank you for your purchase!",
    description:
      "Your PayPal order is confirmed. We’ve sent the receipt and login instructions to the email connected to your PayPal account.",
    ctas: [
      { label: "Open Your Account", href: "/account" },
      { label: "Need Help?", href: "/support", variant: "outline" },
    ],
  },
  external: {
    title: "Success! We received your order",
    description: "",
    ctas: [],
  },
};

const RESOURCE_LINKS: ResourceLink[] = [
  {
    title: "My Account",
    description: "Access your downloads, license keys, and billing history.",
    href: "/account",
    icon: Download,
  },
  {
    title: "Installation Instructions",
    description: "Step-by-step setup guides for every tool in your bundle.",
    href: "#",
    icon: BookOpen,
  },
  {
    title: "Join the Community",
    description: "Connect with other SERP users, share wins, and get tips.",
    href: "https://serp.ly/@serp/community",
    icon: Users,
  },
  {
    title: "Help Center",
    description: "Search FAQs, troubleshooting articles, and walkthroughs.",
    href: "https://apps.serp.co/support",
    icon: MessageCircle,
  },
  {
    title: "Contact Support",
    description: "Can’t find what you need? Reach our team in a couple clicks.",
    href: "https://tawk.to/serpcompany",
    icon: MessageCircle,
  },
];

const SUCCESS_VIDEO_SRC = process.env.NEXT_PUBLIC_SUCCESS_VIDEO_URL ?? "";

const WHITELIST_GUIDES: WhitelistGuide[] = [
  {
    title: "Gmail (Desktop)",
    mediaSrc: process.env.NEXT_PUBLIC_WHITELIST_GMAIL_DESKTOP,
    alt: "Whitelist SERP emails in Gmail on desktop",
  },
  {
    title: "Gmail (Mobile)",
    mediaSrc: process.env.NEXT_PUBLIC_WHITELIST_GMAIL_MOBILE,
    alt: "Whitelist SERP emails in Gmail on mobile",
  },
];

function getVariant(sessionId: string | null, source: string | null, paypalOrderId: string | null): CheckoutVariant {
  if (sessionId) return "stripe";
  if (!sessionId && source === "paypal" && paypalOrderId) return "paypal";
  return "external";
}

function isInternalRoute(href: string | Route): href is Route {
  return typeof href === "string" ? href.startsWith("/") : true;
}

export function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const source = searchParams.get("source");
  const paypalOrderId = searchParams.get("order_id");

  const [processing, setProcessing] = useState(Boolean(sessionId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setProcessing(false);
      return;
    }

    processCheckoutSession(sessionId)
      .then((result) => {
        if (!result.success) {
          console.warn("Failed to process checkout:", result.message);
        }
      })
      .catch((err) => {
        console.error("Error processing checkout:", err);
        setError("There was an issue processing your order. Contact support if you don't receive your license key.");
      })
      .finally(() => setProcessing(false));
  }, [sessionId]);

  const variant = useMemo<CheckoutVariant>(() => getVariant(sessionId, source, paypalOrderId), [sessionId, source, paypalOrderId]);
  const orderReference = sessionId ?? paypalOrderId ?? undefined;
  const heroCopy = HERO_COPY[variant];
  const whitelistMedia = useMemo(() => WHITELIST_GUIDES.filter((guide) => Boolean(guide.mediaSrc)), [],);
  const hasWhitelistMedia = whitelistMedia.length > 0;

  return (
    <div className="bg-background py-12">
      <ConversionTracking />
      <div className="container mx-auto flex max-w-4xl flex-col gap-10 px-4">
        <section className="space-y-6">
          {processing && (
            <div className="flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600" />
              Processing your order and generating license key...
            </div>
          )}

          {error && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
          )}

          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted">
              <CheckCircle className="h-9 w-9 text-green-600" />
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{heroCopy.title}</h1>
              <p className="text-base text-muted-foreground">{heroCopy.description}</p>
            </div>

            {orderReference && (
              <div className="mx-auto w-full max-w-md rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3 text-left">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Order reference</p>
                <p className="mt-1 break-all font-mono text-sm text-foreground">{orderReference}</p>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              {heroCopy.ctas.map((cta) => {
                const Icon = cta.icon;
                return (
                  <Button
                    key={cta.label}
                    asChild
                    variant={cta.variant ?? "default"}
                    className="flex-1"
                  >
                    {isInternalRoute(cta.href) ? (
                      <Link href={cta.href}>
                        {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
                        {cta.label}
                      </Link>
                    ) : (
                      <a href={cta.href}>
                        {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
                        {cta.label}
                      </a>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        </section>

        <section>
          {SUCCESS_VIDEO_SRC ? (
            <video
              key={SUCCESS_VIDEO_SRC}
              src={SUCCESS_VIDEO_SRC}
              autoPlay
              muted
              playsInline
              controls
              className="aspect-video w-full rounded-md border border-border bg-black"
            />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center rounded-md border border-dashed border-border bg-muted/40 text-sm text-muted-foreground">
              Add NEXT_PUBLIC_SUCCESS_VIDEO_URL to autoplay your thank-you video.
            </div>
          )}
        </section>

        {hasWhitelistMedia ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Make sure you get our emails</h2>
            </div>

            <div className="space-y-6">
              {whitelistMedia.map((guide) => (
                <div key={guide.title} className="space-y-2">
                  {guide.mediaSrc ? (
                    <Image
                      src={guide.mediaSrc}
                      alt={guide.alt ?? guide.title}
                      width={960}
                      height={540}
                      className="aspect-video w-full rounded-md border border-border object-cover"
                      priority={false}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Quick resources</h2>
          </div>

          <div className="space-y-3">
            {RESOURCE_LINKS.map((resource) => {
              const Icon = resource.icon;
              return (
                <a
                  key={resource.title}
                  href={resource.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3 transition hover:bg-muted/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{resource.title}</p>
                    <p className="text-sm text-muted-foreground">{resource.description}</p>
                  </div>
                </a>
              );
            })}
          </div>

        </section>
      </div>
    </div>
  );
}
