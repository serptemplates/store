import { headers } from "next/headers";
import { redirect } from "next/navigation";

type CheckoutSearchParams = {
  [key: string]: string | string[] | undefined;
  product?: string | string[];
  coupon?: string | string[];
  couponCode?: string | string[];
  discount?: string | string[];
  promo?: string | string[];
  aff?: string | string[];
  affiliate?: string | string[];
  affiliateId?: string | string[];
  am_id?: string | string[];
};

const METADATA_FIELD_LIMIT = 50;

function toFirstValue(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function sanitizeInput(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildMetadata(base: Record<string, string>, extras: Record<string, string | undefined>): Record<string, string> {
  const metadata: Record<string, string> = { ...base };
  for (const [key, value] of Object.entries(extras)) {
    if (!value) continue;
    if (metadata[key] !== undefined) continue;
    metadata[key] = value;
    if (Object.keys(metadata).length >= METADATA_FIELD_LIMIT) {
      break;
    }
  }
  return metadata;
}

type SessionResponse = {
  url?: string | null;
  id?: string | null;
  error?: string | null;
};

async function createCheckoutSession({
  baseUrl,
  body,
}: {
  baseUrl: string;
  body: Record<string, unknown>;
}): Promise<SessionResponse> {
  const response = await fetch(`${baseUrl}/api/checkout/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  let payload: SessionResponse | null = null;
  try {
    payload = (await response.json()) as SessionResponse;
  } catch {
    // ignore; handled below
  }

  if (!response.ok) {
    const message = payload?.error ?? `Failed to create checkout session (${response.status})`;
    throw new Error(message);
  }

  return payload ?? {};
}

async function resolveBaseUrl(): Promise<string> {
  const headerList = await headers();
  const forwardedHost = headerList.get("x-forwarded-host");
  const host = forwardedHost ?? headerList.get("host");
  if (!host) {
    return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://apps.serp.co";
  }
  const protocol = headerList.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
}

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ searchParams }: { searchParams?: Promise<CheckoutSearchParams> }) {
  const params = (searchParams ? await searchParams : {}) ?? {};
  const productParam = sanitizeInput(toFirstValue(params.product));

  if (!productParam) {
    redirect("/");
  }

  const couponParam =
    sanitizeInput(toFirstValue(params.coupon)) ??
    sanitizeInput(toFirstValue(params.couponCode)) ??
    sanitizeInput(toFirstValue(params.discount)) ??
    sanitizeInput(toFirstValue(params.promo));

  const affiliateParam =
    sanitizeInput(toFirstValue(params.aff)) ??
    sanitizeInput(toFirstValue(params.affiliate)) ??
    sanitizeInput(toFirstValue(params.affiliateId)) ??
    sanitizeInput(toFirstValue(params.am_id));

  const metadata = buildMetadata(
    {
      landerId: productParam,
      checkoutSource: "hosted_checkout_stripe",
    },
    {
      couponCode: couponParam?.toUpperCase(),
      affiliateId: affiliateParam,
    },
  );

  const payload: Record<string, unknown> = {
    offerId: productParam,
    quantity: 1,
    metadata,
  };

  if (couponParam) {
    payload.couponCode = couponParam.toUpperCase();
  }

  if (affiliateParam) {
    payload.affiliateId = affiliateParam;
  }

  try {
    const baseUrl = await resolveBaseUrl();
    const session = await createCheckoutSession({ baseUrl, body: payload });
    if (session?.url) {
      redirect(session.url);
    }
    throw new Error("Checkout session missing redirect URL");
  } catch (error) {
    console.error("[checkout] server redirect failed", {
      offerId: productParam,
      message: error instanceof Error ? error.message : String(error),
    });

    const fallback = `/product-details/product/${productParam}?checkoutError=1`;
    redirect(fallback);
  }
}
