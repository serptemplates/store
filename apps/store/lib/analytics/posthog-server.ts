import { PostHog } from "posthog-node";

type PostHogServerClient = PostHog | null;

let posthogClient: PostHogServerClient = null;

const POSTHOG_API_KEY =
  process.env.POSTHOG_API_KEY ??
  process.env.NEXT_PUBLIC_POSTHOG_KEY ??
  "";

const POSTHOG_API_HOST =
  process.env.POSTHOG_API_HOST ??
  process.env.NEXT_PUBLIC_POSTHOG_HOST ??
  "https://us.i.posthog.com";

function getPostHogClient(): PostHogServerClient {
  if (!POSTHOG_API_KEY) {
    return null;
  }

  if (posthogClient) {
    return posthogClient;
  }

  posthogClient = new PostHog(POSTHOG_API_KEY, {
    host: POSTHOG_API_HOST,
    flushAt: 1,
    flushInterval: 0,
  });

  return posthogClient;
}

type CaptureOptions = {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
};

export function captureServerEvent({ distinctId, event, properties }: CaptureOptions): void {
  const client = getPostHogClient();
  if (!client) {
    return;
  }

  client.capture({
    distinctId,
    event,
    properties: {
      environment: process.env.NODE_ENV,
      ...properties,
    },
  });
}
