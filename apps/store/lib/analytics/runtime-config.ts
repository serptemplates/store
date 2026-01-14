import type { SiteConfig } from "@/lib/site-config";

type Env = Record<string, string | undefined>;

type ResolveGtmOptions = {
  env?: Env;
  siteConfig?: SiteConfig | null;
};

type PostHogConfig = {
  key: string | null;
  host: string;
  disabled: boolean;
  enabled: boolean;
};

type DubConfig = {
  publishableKey: string | null;
  runtimeHint: string;
  isProductionRuntime: boolean;
  enabled: boolean;
};

export function resolveRuntimeHint(env: Env = process.env): string {
  return (
    env.NEXT_PUBLIC_RUNTIME_ENV ??
    env.RUNTIME_ENV ??
    env.APP_ENV ??
    env.VERCEL_ENV ??
    env.NODE_ENV ??
    "development"
  );
}

export function resolveGtmId(options: ResolveGtmOptions = {}): string | null {
  const env = options.env ?? process.env;
  const envGtm = env.NEXT_PUBLIC_GTM_ID;
  if (envGtm && envGtm.trim().length > 0) {
    return envGtm.trim();
  }

  const configGtm = options.siteConfig?.gtmId;
  if (configGtm && configGtm.trim().length > 0) {
    return configGtm.trim();
  }

  return null;
}

export function resolvePostHogConfig(env: Env = process.env): PostHogConfig {
  const key = env.NEXT_PUBLIC_POSTHOG_KEY ?? null;
  const host = env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
  const disabled = env.NEXT_PUBLIC_POSTHOG_DISABLED === "true";
  const enabled = Boolean(key && key.startsWith("phc_") && !disabled);

  return {
    key,
    host,
    disabled,
    enabled,
  };
}

export function resolveDubConfig(env: Env = process.env): DubConfig {
  const publishableKey = env.NEXT_PUBLIC_DUB_PUBLISHABLE_KEY ?? null;
  const runtimeHint = resolveRuntimeHint(env);
  const normalizedRuntime = runtimeHint.trim().toLowerCase();
  const isProductionRuntime = ["production", "preview", "staging"].includes(normalizedRuntime);
  const enabled = Boolean(publishableKey && isProductionRuntime);

  return {
    publishableKey,
    runtimeHint,
    isProductionRuntime,
    enabled,
  };
}
