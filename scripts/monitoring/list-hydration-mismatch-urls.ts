#!/usr/bin/env tsx
/**
 * List URLs with React hydration mismatch errors captured in PostHog.
 *
 * Looks for `$exception` events with messages containing hydration keywords,
 * groups by `url` property, and prints the top N.
 *
 * Env vars:
 *   POSTHOG_API_KEY        Personal API key (Bearer). Required.
 *   POSTHOG_PROJECT_ID     Project id. Optional if NEXT_PUBLIC_POSTHOG_KEY is set; we'll resolve it.
 *   NEXT_PUBLIC_POSTHOG_KEY    Project API token to match the project (optional).
 *   POSTHOG_API_HOST       API host (defaults to https://us.i.posthog.com)
 *   WINDOW                 Time window, e.g. "-14d" (defaults to -14d)
 *   LIMIT                  Max URLs (defaults to 200)
 */

const API_KEY = process.env.POSTHOG_API_KEY || "";
const API_HOST = (process.env.POSTHOG_API_HOST || "https://us.i.posthog.com").replace(/\/$/, "");
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID || "";
const PROJECT_TOKEN = process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.POSTHOG_PROJECT_TOKEN || "";
const WINDOW = process.env.WINDOW || "-14d";
const LIMIT = Number(process.env.LIMIT || 200);

if (!API_KEY) {
  console.error("Missing POSTHOG_API_KEY (personal API key) in environment.");
  process.exit(1);
}

type PostHogProject = { id: number; api_token?: string };

async function posthogRequest<T = unknown>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_HOST}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  const data = (isJson ? await response.json() : await response.text()) as T;
  return { ok: response.ok, status: response.status, data };
}

async function resolveProjectId(): Promise<number> {
  if (PROJECT_ID) return Number(PROJECT_ID);

  // Fast path: try to read the current user's default team/project
  {
    const { ok, status, data } = await posthogRequest<any>("/api/users/@me");
    if (ok && data) {
      // PostHog responses typically include the active team as `team` or `organization.teams`
      const teamId = (data.team && data.team.id) || (data.organization && data.organization.teams && data.organization.teams[0]?.id);
      if (teamId) {
        return Number(teamId);
      }
    } else if (status !== 404) {
      // If it's not a 404, treat it as a real error
      // 404 just means the endpoint isn't available for this env
      console.warn(`Warning: failed to read /api/users/@me (status ${status}).`);
    }
  }

  // Fallback: list projects (requires org-level permission)
  {
    const { ok, status, data } = await posthogRequest<{ results: PostHogProject[] }>("/api/projects/");
    if (!ok) {
      throw new Error(`Failed to list PostHog projects (status ${status}). Provide POSTHOG_PROJECT_ID explicitly.`);
    }

    const projects = Array.isArray((data as any).results) ? ((data as any).results as PostHogProject[]) : [];
    if (PROJECT_TOKEN) {
      const match = projects.find((p) => p.api_token === PROJECT_TOKEN);
      if (match) return match.id;
    }

    if (projects.length > 0) {
      return projects[0].id;
    }
  }

  throw new Error("Unable to resolve PostHog project id. Set POSTHOG_PROJECT_ID.");
}

function buildHogQLQuery(windowExpr: string, limit: number): string {
  // Filter for hydration errors in exception messages
  const where = [
    "event = '$exception'",
    "(properties.message ILIKE '%Hydration%' OR properties.message ILIKE '%Minified React error #418%' OR properties.message ILIKE '%hydration mismatch%')",
    `timestamp > now() - INTERVAL ${JSON.stringify(windowExpr)}`,
  ].join(" AND ");

  // Some events might be missing url; coalesce to '(unknown)'
  return `
    SELECT 
      coalesce(toString(properties.url), '(unknown)') AS url,
      count() AS count
    FROM events
    WHERE ${where}
    GROUP BY url
    ORDER BY count DESC
    LIMIT ${limit}
  `;
}

async function run() {
  const projectId = await resolveProjectId();
  const query = buildHogQLQuery(WINDOW, LIMIT);

  const { ok, status, data } = await posthogRequest<any>(
    `/api/projects/${projectId}/query/`,
    {
      method: "POST",
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
    },
  );

  if (!ok) {
    throw new Error(`Query failed (status ${status}): ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }

  // PostHog returns results in a tabular form; normalize to a simple list
  const rows: any[] = (data?.results?.[0]?.results || data?.results || data?.result || []) as any[];
  const normalized = rows.map((row: any) => {
    if (Array.isArray(row)) {
      const [url, count] = row;
      return { url, count: Number(count) };
    }
    if (row && typeof row === 'object') {
      return { url: row.url ?? row["properties.url"] ?? "(unknown)", count: Number(row.count ?? row["count()"] ?? 0) };
    }
    return row;
  });

  console.log(JSON.stringify({ projectId, window: WINDOW, total: normalized.length, items: normalized }, null, 2));
}

run().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
