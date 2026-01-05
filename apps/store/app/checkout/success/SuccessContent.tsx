"use client";

import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle,
  MessageCircle,
  Users,
} from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

import { processCheckoutSession, processGhlPayment, processPayPalCheckout } from "./actions";
import { ConversionTracking, type ConversionData } from "./tracking";

type CheckoutVariant = "stripe" | "ghl" | "paypal" | "external";

type HeroCopy = {
  title: string;
  description: string;
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

const HERO_COPY: HeroCopy = {
  title: "Thank you for your purchase!",
  description:
    "Your order is confirmed. We’ve sent a receipt and verification email to the address you used at checkout. It should arrive shortly.",
};

const RESOURCE_LINKS: ResourceLink[] = [
  {
    title: "Installation Instructions",
    description: "Step-by-step setup guides for every tool in your bundle.",
    href: "https://github.com/orgs/serpapps/discussions/75",
    icon: BookOpen,
  },
  {
    title: "Help Center",
    description: "Search FAQs, troubleshooting articles, and walkthroughs.",
    href: "https://help.serp.co",
    icon: MessageCircle,
  },
  {
    title: "Community",
    description: "Connect with other SERP users, share wins, and get tips.",
    href: "https://serp.ly/@serp/community",
    icon: Users,
  },
];

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

function resolveVariant({
  provider,
  sessionId,
  source,
  paypalToken,
}: {
  provider: string | null;
  sessionId: string | null;
  source: string | null;
  paypalToken: string | null;
}): CheckoutVariant {
  const normalizedProvider = provider?.toLowerCase().trim();

  if (normalizedProvider === "stripe") return "stripe";
  if (normalizedProvider === "ghl") return "ghl";
  if (normalizedProvider === "paypal") return "paypal";
  if (paypalToken) return "paypal";

  if (sessionId) return "stripe";
  if (source && source.startsWith("ghl")) return "ghl";
  return "external";
}

export function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const source = searchParams.get("source");
  const providerParam = searchParams.get("provider");
  const ghlPaymentId = searchParams.get("payment_id") ?? searchParams.get("transaction_id");
  const ghlProductSlug = searchParams.get("product") ?? searchParams.get("offer");
  const slugParam = searchParams.get("slug");
  const paypalToken = searchParams.get("token");
  const paypalAccountAlias = searchParams.get("paypal_account");
  const paypalModeParam = searchParams.get("paypal_mode");

  const variant = useMemo<CheckoutVariant>(
    () =>
      resolveVariant({
        provider: providerParam,
        sessionId,
        source,
        paypalToken,
      }),
    [providerParam, sessionId, source, paypalToken],
  );

  const [processing, setProcessing] = useState(() => {
    if (variant === "stripe") {
      return Boolean(sessionId);
    }
    if (variant === "ghl") {
      return true;
    }
    if (variant === "paypal") {
      return Boolean(paypalToken);
    }
    return false;
  });
  const [error, setError] = useState<string | null>(null);
  const [productSlug, setProductSlug] = useState<string | null>(slugParam);
  const [orderDetails, setOrderDetails] = useState<ConversionData | null>(null);

  useEffect(() => {
    let cancelled = false;

    type ProcessResult = Awaited<ReturnType<typeof processCheckoutSession>>;

    const applyOrderResult = (result: ProcessResult) => {
      if (cancelled) return;

      if (!result.success) {
        console.warn("Failed to process checkout:", result.message);
        return;
      }

      if (result.order) {
        const conversionItems =
          result.order.items?.map((item) => ({
            id: item.id,
            name: item.name,
            price: typeof item.price === "number" ? Number(item.price.toFixed(2)) : 0,
            quantity: item.quantity,
          })) ?? [];

        setOrderDetails({
          sessionId: result.order.sessionId,
          value: result.order.amount ?? undefined,
          currency: result.order.currency ?? undefined,
          items: conversionItems,
          coupon: result.order.coupon ?? undefined,
          affiliateId: result.order.affiliateId ?? undefined,
          productSlug: result.order.productSlug ?? null,
        });

        if (result.order.productSlug) {
          setProductSlug(result.order.productSlug);
        }
      }
    };

    const handleError = (err: unknown) => {
      if (cancelled) return;
      console.error("Error processing checkout:", err);
      setError("There was an issue processing your order. Contact support if you don't receive your license key.");
    };

    setOrderDetails(null);
    setError(null);

    if (variant === "stripe" && sessionId) {
      setProcessing(true);
      processCheckoutSession(sessionId)
        .then(applyOrderResult)
        .catch(handleError)
        .finally(() => {
          if (!cancelled) {
            setProcessing(false);
          }
        });
      return () => {
        cancelled = true;
      };
    }

    if (variant === "paypal" && paypalToken) {
      setProcessing(true);
      processPayPalCheckout({
        orderId: paypalToken,
        accountAlias: paypalAccountAlias,
        mode: paypalModeParam === "live" ? "live" : paypalModeParam === "test" ? "test" : null,
      })
        .then(applyOrderResult)
        .catch(handleError)
        .finally(() => {
          if (!cancelled) {
            setProcessing(false);
          }
        });

      return () => {
        cancelled = true;
      };
    }

    if (variant === "ghl") {
      setProcessing(true);
      processGhlPayment({ paymentId: ghlPaymentId, productSlug: ghlProductSlug })
        .then(applyOrderResult)
        .catch(handleError)
        .finally(() => {
          if (!cancelled) {
            setProcessing(false);
          }
        });

      return () => {
        cancelled = true;
      };
    }

    setProcessing(false);

    return () => {
      cancelled = true;
    };
  }, [variant, sessionId, ghlPaymentId, ghlProductSlug, paypalToken, paypalAccountAlias, paypalModeParam]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    let mutated = false;

    if (productSlug && url.searchParams.get("slug") !== productSlug) {
      url.searchParams.set("slug", productSlug);
      mutated = true;
    }

    const providerValue = providerParam ?? variant;
    if (providerValue && url.searchParams.get("provider") !== providerValue) {
      url.searchParams.set("provider", providerValue);
      mutated = true;
    }

    if (mutated) {
      const search = url.searchParams.toString();
      const nextUrl = search ? `${url.pathname}?${search}` : url.pathname;
      window.history.replaceState({}, "", nextUrl);
    }
  }, [productSlug, providerParam, variant]);

  const whitelistMedia = useMemo(() => WHITELIST_GUIDES.filter((guide) => Boolean(guide.mediaSrc)), [],);
  const hasWhitelistMedia = whitelistMedia.length > 0;

  const resolvedSessionId =
    orderDetails?.sessionId ??
    sessionId ??
    ghlPaymentId ??
    null;
  const analyticsProvider = providerParam ?? variant;

  return (
    <div className="bg-background py-12">
      <ConversionTracking
        sessionId={resolvedSessionId}
        order={orderDetails}
        provider={analyticsProvider}
      />
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
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{HERO_COPY.title}</h1>
              <p className="text-base text-muted-foreground">{HERO_COPY.description}</p>
            </div>
          </div>
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
