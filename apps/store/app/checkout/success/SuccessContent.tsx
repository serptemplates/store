"use client";

import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle,
  Download,
  MessageCircle,
  Play,
  Users,
} from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

import { processCheckoutSession, processGhlPayment, processPaypalOrder } from "./actions";
import { ConversionTracking, type ConversionData } from "./tracking";

type CheckoutVariant = "stripe" | "paypal" | "ghl" | "external";

type CtaDefinition = {
  label: string;
  href: string;
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

type SuccessVideoSource =
  | {
      kind: "youtube";
      id: string;
      embedUrl: string;
      autoplayUrl: string;
      thumbnailUrl: string;
      fallbackThumbnailUrl?: string;
    }
  | { kind: "file"; src: string };

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
  ghl: {
    title: "Thank you for your purchase!",
    description:
      "Your order is confirmed. Watch the video below for your next steps.",
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
    href: "https://github.com/orgs/serpapps/discussions/59",
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
    href: "https://serpcompany.tawk.help/",
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
const DEFAULT_SUCCESS_VIDEO_ID = "eTXRjdODowE";

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
  if (!sessionId && source && source.startsWith("ghl")) return "ghl";
  if (!sessionId && source === "paypal" && paypalOrderId) return "paypal";
  return "external";
}

function getYouTubeVideoId(candidate: string): string | null {
  const trimmed = candidate.trim();
  if (!trimmed) return null;

  const idMatcher = /^[a-zA-Z0-9_-]{11}$/;
  if (idMatcher.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.toLowerCase();
    const pathSegments = url.pathname.split("/").filter(Boolean);

    if (hostname === "youtu.be" && pathSegments[0]) {
      return pathSegments[0];
    }

    const youtubeHostnames = [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com"
    ];
    if (youtubeHostnames.includes(hostname)) {
      if (url.pathname === "/watch") {
        return url.searchParams.get("v");
      }

      if (pathSegments[0] === "embed" && pathSegments[1]) {
        return pathSegments[1];
      }

      if (pathSegments[0] === "shorts" && pathSegments[1]) {
        return pathSegments[1];
      }
    }
  } catch {
    return null;
  }

  return null;
}

function buildYouTubeEmbedUrl(id: string, autoplay = false): string {
  const params = new URLSearchParams({
    autoplay: autoplay ? "1" : "0",
    mute: "0",
    playsinline: "1",
    rel: "0",
  });
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

function buildYouTubeThumbnailUrls(id: string): { primary: string; fallback?: string } {
  const primary = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
  const fallback = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  return { primary, fallback };
}

function buildYouTubeSuccessVideo(id: string): SuccessVideoSource {
  const thumbnailUrls = buildYouTubeThumbnailUrls(id);
  return {
    kind: "youtube",
    id,
    embedUrl: buildYouTubeEmbedUrl(id),
    autoplayUrl: buildYouTubeEmbedUrl(id, true),
    thumbnailUrl: thumbnailUrls.primary,
    fallbackThumbnailUrl: thumbnailUrls.fallback,
  };
}

export function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const source = searchParams.get("source");
  const paypalOrderId = searchParams.get("order_id");
  const ghlPaymentId = searchParams.get("payment_id") ?? searchParams.get("transaction_id");
  const ghlProductSlug = searchParams.get("product") ?? searchParams.get("offer");

  const variant = useMemo<CheckoutVariant>(() => getVariant(sessionId, source, paypalOrderId), [sessionId, source, paypalOrderId]);

  const [processing, setProcessing] = useState(() => {
    if (variant === "stripe") {
      return Boolean(sessionId);
    }
    if (variant === "paypal") {
      return Boolean(paypalOrderId);
    }
    if (variant === "ghl") {
      return true;
    }
    return false;
  });
  const [error, setError] = useState<string | null>(null);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [thumbnailSrc, setThumbnailSrc] = useState<string | undefined>(undefined);
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
        });
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

    if (variant === "paypal" && paypalOrderId) {
      setProcessing(true);
      processPaypalOrder({ orderId: paypalOrderId })
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
  }, [variant, sessionId, paypalOrderId, ghlPaymentId, ghlProductSlug]);

  const orderReference = sessionId ?? paypalOrderId ?? ghlPaymentId ?? undefined;
  const heroCopy = HERO_COPY[variant];
  const whitelistMedia = useMemo(() => WHITELIST_GUIDES.filter((guide) => Boolean(guide.mediaSrc)), [],);
  const hasWhitelistMedia = whitelistMedia.length > 0;
  const successVideo = useMemo<SuccessVideoSource>(() => {
    const trimmed = SUCCESS_VIDEO_SRC.trim();
    if (trimmed) {
      const youtubeId = getYouTubeVideoId(trimmed);
      if (youtubeId) {
        return buildYouTubeSuccessVideo(youtubeId);
      }
      return { kind: "file", src: trimmed };
    }

    return buildYouTubeSuccessVideo(DEFAULT_SUCCESS_VIDEO_ID);
  }, []);

  const resolvedSessionId = sessionId ?? orderDetails?.sessionId ?? paypalOrderId ?? null;

  useEffect(() => {
    if (successVideo.kind === "youtube") {
      setThumbnailSrc(successVideo.thumbnailUrl);
    } else {
      setThumbnailSrc(undefined);
    }
  }, [successVideo]);

  return (
    <div className="bg-background py-12">
      <ConversionTracking sessionId={resolvedSessionId} order={orderDetails} provider={variant} />
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

            <div className="mx-auto w-full max-w-3xl">
              {successVideo.kind === "youtube" ? (
                isVideoActive ? (
                  <iframe
                    key={successVideo.autoplayUrl}
                    src={successVideo.autoplayUrl}
                    title="Welcome video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="aspect-video w-full rounded-md border border-border bg-black"
                    loading="lazy"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsVideoActive(true)}
                    className="group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md border border-border bg-black"
                    aria-label="Play welcome video"
                  >
                    <Image
                      src={thumbnailSrc ?? successVideo.thumbnailUrl}
                      alt="Welcome video thumbnail"
                      fill
                      className="object-cover transition duration-200 group-hover:scale-[1.01]"
                      sizes="(max-width: 768px) 100vw, 800px"
                      priority={false}
                      onError={() => {
                        if (successVideo.fallbackThumbnailUrl && thumbnailSrc !== successVideo.fallbackThumbnailUrl) {
                          setThumbnailSrc(successVideo.fallbackThumbnailUrl);
                        }
                      }}
                    />
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 bg-black/35 transition duration-200 group-hover:bg-black/45"
                    />
                    <span className="relative inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-foreground shadow-md transition duration-200 group-hover:bg-white">
                      <Play className="h-4 w-4" />
                      Watch welcome video
                    </span>
                  </button>
                )
              ) : (
                <video
                  key={successVideo.src}
                  src={successVideo.src}
                  playsInline
                  controls
                  preload="metadata"
                  className="aspect-video w-full rounded-md border border-border bg-black"
                />
              )}
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
