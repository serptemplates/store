#!/usr/bin/env tsx
/**
 * Upserts a PostHog insight for monitoring checkout CTA fallbacks.
 *
 * Usage:
 *   POSTHOG_API_KEY=phx_... POSTHOG_PROJECT_ID=12345 pnpm tsx scripts/monitoring/create-checkout-fallback-alert.ts
 *
 * Optional env vars:
 *   POSTHOG_API_HOST         Override API host (defaults to https://us.i.posthog.com)
 *   POSTHOG_ALERT_DESTINATION Slack channel / email to include in the summary message (alerts still need manual setup)
 */

const API_KEY = process.env.POSTHOG_API_KEY
const PROJECT_ID =
  process.env.POSTHOG_PROJECT_ID ??
  process.env.POSTHOG_ENV_ID ??
  process.env.POSTHOG_PROJECT ??
  ""
const API_HOST = (process.env.POSTHOG_API_HOST ?? "https://us.i.posthog.com").replace(/\/$/, "")

if (!API_KEY) {
  console.error("Missing POSTHOG_API_KEY environment variable.")
  process.exit(1)
}

if (!PROJECT_ID) {
  console.error("Missing POSTHOG_PROJECT_ID (or POSTHOG_ENV_ID) environment variable.")
  process.exit(1)
}

const INSIGHT_NAME =
  process.env.POSTHOG_CHECKOUT_INSIGHT_NAME ?? "Checkout Fallback Monitor"
const INSIGHT_DESCRIPTION =
  "Tracks how often live products fall back to a non-checkout destination after a CTA click."

type PostHogInsight = {
  id: number
  name: string
  filters?: Record<string, unknown>
}

async function posthogRequest<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number; data: T; response: Response }> {
  const response = await fetch(`${API_HOST}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })

  const contentType = response.headers.get("content-type")
  const isJson = contentType?.includes("application/json")
  const data = (isJson ? await response.json() : (await response.text())) as T

  return {
    ok: response.ok,
    status: response.status,
    data,
    response,
  }
}

async function findExistingInsight(): Promise<PostHogInsight | null> {
  const search = encodeURIComponent(INSIGHT_NAME)
  const { ok, data, status } = await posthogRequest<{ results: PostHogInsight[] }>(
    `/api/projects/${PROJECT_ID}/insights/?limit=50&search=${search}`,
  )

  if (!ok) {
    throw new Error(
      `Failed to list insights from PostHog (status ${status}): ${JSON.stringify(data)}`,
    )
  }

  const candidates = (data.results ?? []).filter((insight) => insight.name === INSIGHT_NAME)
  return candidates.length > 0 ? candidates[0] : null
}

function buildInsightPayload() {
  const fallbackFilters = [
    {
      key: "destination",
      value: "checkout",
      operator: "is_not",
      type: "event",
    },
    {
      key: "productStatus",
      value: "live",
      operator: "exact",
      type: "event",
    },
  ]

  const events = [
    {
      id: "product_checkout_clicked",
      name: "Fallback CTA clicks (live products)",
      type: "events",
      math: "total",
      properties: fallbackFilters,
    },
  ]

  const filters = {
    insight: "TRENDS",
    display: "ActionsLineGraph",
    interval: "minute",
    date_from: "-24h",
    events,
  }

  const query = {
    kind: "InsightVizNode",
    source: {
      kind: "TrendsQuery",
      series: [
        {
          kind: "EventsNode",
          event: "product_checkout_clicked",
          name: "Fallback CTA clicks (live products)",
          math: "total",
          properties: fallbackFilters,
        },
      ],
      interval: "minute" as const,
      properties: [],
      trendsFilter: {
        display: "ActionsLineGraph",
        showLegend: true,
        yAxisScaleType: "linear",
        showValuesOnSeries: false,
        showPercentStackView: false,
        resultCustomizationBy: "value",
        showAlertThresholdLines: true,
      },
      dateRange: {
        explicitDate: false,
        date_from: "-24h",
      },
      compareFilter: {
        compare: false,
      },
      filterTestAccounts: false,
    },
  }

  return {
    name: INSIGHT_NAME,
    description: INSIGHT_DESCRIPTION,
    filters,
    query,
    tags: ["checkout", "monitoring"],
    is_sample: false,
  }
}

async function upsertInsight(): Promise<PostHogInsight> {
  const existing = await findExistingInsight()
  const payload = buildInsightPayload()

  if (existing) {
    const { ok, data, status } = await posthogRequest<PostHogInsight>(
      `/api/projects/${PROJECT_ID}/insights/${existing.id}/`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    )

    if (!ok) {
      throw new Error(`Failed to update insight ${existing.id} (status ${status}).`)
    }

    return data
  }

  const { ok, data, status } = await posthogRequest<PostHogInsight>(
    `/api/projects/${PROJECT_ID}/insights/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  )

  if (!ok) {
    throw new Error(`Failed to create insight (status ${status}).`)
  }

  return data
}

async function main() {
  console.log(`Using PostHog project ${PROJECT_ID} @ ${API_HOST}`)
  const insight = await upsertInsight()

  console.log(
    `✅ Insight ready: ${insight.name} (id: ${insight.id}) → ${API_HOST}/insight/${insight.id}`,
  )

  if (process.env.POSTHOG_ALERT_DESTINATION) {
    console.warn(
      "ℹ️  Alert automation is currently blocked for personal API keys. Please create the alert in the PostHog UI:",
    )
  } else {
    console.warn("ℹ️  Create a PostHog alert from this insight (UI → Save insight → Add alert).")
  }

  console.warn(
    "Recommended alert copy: Monitor `product_checkout_clicked` events where destination ≠ checkout for sustained spikes (> 2 hits / 15 min).",
  )
  if (process.env.POSTHOG_ALERT_DESTINATION) {
    console.warn(
      `Suggested destination (${process.env.POSTHOG_ALERT_DESTINATION}) noted for your manual setup.`,
    )
  }
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
