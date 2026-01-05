import { loadScriptEnvironment } from "./utils/env";
import { getProductData, getProductSlugs } from "../lib/products/product";

type EntitlementCatalogEntry = {
  name: string;
  description?: string | null;
  metadataJson?: string | null;
  metadata_json?: string | null;
};

type EntitlementAliasEntry = {
  alias: string;
  canonicalName?: string;
  canonical?: string;
};

type EntitlementCatalogResponse = {
  source?: string;
  entitlements?: EntitlementCatalogEntry[];
  catalog?: EntitlementCatalogEntry[];
  aliases?: EntitlementAliasEntry[];
};

type LintIssue =
  | { type: "unknown"; slug: string; entitlement: string }
  | { type: "alias"; slug: string; entitlement: string; canonicalName: string };

function getBaseUrl(): string {
  const raw = process.env.SERP_AUTH_BASE_URL ?? "https://auth.serp.co";
  return raw.replace(/\/+$/, "");
}

function getCatalogToken(): string | null {
  const token = process.env.INTERNAL_ENTITLEMENTS_TOKEN ?? "";
  return token.trim().length > 0 ? token.trim() : null;
}

function resolveProductEntitlements(raw: unknown): string[] {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed ? [trimmed] : [];
  }
  if (!Array.isArray(raw)) return [];
  const entitlements: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (trimmed) entitlements.push(trimmed);
  }
  return entitlements;
}

function normalizeCatalogResponse(raw: EntitlementCatalogResponse): {
  source?: string;
  entitlements: EntitlementCatalogEntry[];
  aliases: EntitlementAliasEntry[];
} {
  const entitlements = raw.entitlements ?? raw.catalog ?? [];
  const normalizedEntitlements = entitlements
    .map((entry) => ({
      name: String(entry.name ?? "").trim(),
      description: entry.description ?? null,
      metadataJson: entry.metadataJson ?? entry.metadata_json ?? null,
    }))
    .filter((entry) => entry.name.length > 0);

  const aliases = raw.aliases ?? [];
  const normalizedAliases = aliases
    .map((entry) => ({
      alias: String(entry.alias ?? "").trim(),
      canonicalName: String(entry.canonicalName ?? entry.canonical ?? "").trim(),
    }))
    .filter((entry) => entry.alias.length > 0 && entry.canonicalName.length > 0);

  return {
    source: raw.source,
    entitlements: normalizedEntitlements,
    aliases: normalizedAliases,
  };
}

type D1Config = {
  accountId: string;
  databaseId: string;
  apiToken: string;
};

type D1QueryResponse = {
  success: boolean;
  errors?: Array<{ message?: string }>;
  result?: Array<{ results?: Array<Record<string, unknown>>; success?: boolean }>;
};

function getD1Config(): D1Config | null {
  const accountId = process.env.SERP_AUTH_CF_ACCOUNT_ID ?? "";
  const databaseId = process.env.SERP_AUTH_CF_D1_DATABASE_ID ?? "";
  const apiToken = process.env.SERP_AUTH_CF_API_TOKEN ?? "";
  if (!accountId.trim() || !databaseId.trim() || !apiToken.trim()) {
    return null;
  }
  return {
    accountId: accountId.trim(),
    databaseId: databaseId.trim(),
    apiToken: apiToken.trim(),
  };
}

async function queryD1(config: D1Config, sql: string): Promise<Array<Record<string, unknown>>> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiToken}`,
    },
    body: JSON.stringify({ sql }),
  });

  const payload = (await response.json().catch(() => null)) as D1QueryResponse | null;
  if (!response.ok || !payload || !payload.success) {
    const message = payload?.errors?.map((err) => err.message).filter(Boolean).join("; ");
    throw new Error(`D1 query failed (${response.status}): ${message || "unknown error"}`);
  }
  const result = payload.result?.[0];
  if (result?.success === false) {
    throw new Error("D1 query failed (result not successful).");
  }
  return result?.results ?? [];
}

async function d1TableExists(config: D1Config, table: string): Promise<boolean> {
  const rows = await queryD1(
    config,
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${table.replace(/'/g, "''")}';`,
  );
  return rows.length > 0;
}

async function d1TableHasColumn(config: D1Config, table: string, column: string): Promise<boolean> {
  const exists = await d1TableExists(config, table);
  if (!exists) return false;
  const rows = await queryD1(config, `PRAGMA table_info('${table.replace(/'/g, "''")}');`);
  return rows.some((row) => row.name === column);
}

async function fetchCatalogFromD1(): Promise<EntitlementCatalogResponse> {
  const config = getD1Config();
  if (!config) {
    throw new Error("Missing SERP_AUTH_CF_ACCOUNT_ID/SERP_AUTH_CF_D1_DATABASE_ID/SERP_AUTH_CF_API_TOKEN for D1 lint.");
  }

  const hasCatalog = await d1TableExists(config, "entitlement_catalog");
  if (hasCatalog) {
    const rows = await queryD1(
      config,
      "SELECT name, description, metadata_json AS metadataJson FROM entitlement_catalog ORDER BY name;",
    );
    const entitlements = rows.map((row) => ({
      name: String(row.name ?? "").trim(),
      description: row.description ? String(row.description) : null,
      metadataJson: row.metadataJson ? String(row.metadataJson) : null,
    })).filter((entry) => entry.name.length > 0);

    const aliases: EntitlementAliasEntry[] = [];
    const hasAliases = await d1TableExists(config, "entitlement_aliases");
    if (hasAliases) {
      const aliasColumn = (await d1TableHasColumn(config, "entitlement_aliases", "canonical_name"))
        ? "canonical_name"
        : (await d1TableHasColumn(config, "entitlement_aliases", "canonical"))
          ? "canonical"
          : null;
      if (!aliasColumn) {
        return { source: "catalog", entitlements, aliases };
      }
      const aliasRows = await queryD1(
        config,
        `SELECT alias, ${aliasColumn} AS canonicalName FROM entitlement_aliases ORDER BY alias;`,
      );
      for (const row of aliasRows) {
        const alias = String(row.alias ?? "").trim();
        const canonicalName = String(row.canonicalName ?? "").trim();
        if (!alias || !canonicalName) continue;
        aliases.push({ alias, canonicalName });
      }
    }

    return { source: "catalog", entitlements, aliases };
  }

  const rows = await queryD1(config, "SELECT DISTINCT name FROM entitlements ORDER BY name;");
  const entitlements = rows
    .map((row) => String(row.name ?? "").trim())
    .filter((name) => name.length > 0)
    .map((name) => ({ name }));
  return { source: "entitlements", entitlements, aliases: [] };
}

async function fetchCatalog(): Promise<EntitlementCatalogResponse> {
  const baseUrl = getBaseUrl();
  const token = getCatalogToken();
  if (!token) {
    return fetchCatalogFromD1();
  }

  const url = `${baseUrl}/internal/entitlements/catalog`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "content-type": "application/json",
      "x-entitlements-token": token,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (response.status === 404) {
      console.warn(`Entitlements catalog endpoint not found (404). Falling back to D1 query.`);
      return fetchCatalogFromD1();
    }
    throw new Error(`Failed to fetch entitlements catalog (${response.status}): ${body.slice(0, 500)}`);
  }

  const payload = (await response.json()) as EntitlementCatalogResponse;
  return normalizeCatalogResponse(payload);
}

async function main() {
  loadScriptEnvironment(import.meta.url);

  const response = await fetchCatalog();
  const catalog = response.entitlements ?? [];
  const aliases = response.aliases ?? [];

  if (catalog.length === 0) {
    throw new Error("Entitlements catalog is empty. Populate serp-auth entitlement_catalog first.");
  }

  const canonical = new Set<string>(catalog.map((entry) => entry.name));
  const aliasMap = new Map<string, string>(
    aliases
      .map((entry) => [entry.alias, entry.canonicalName ?? entry.canonical ?? ""] as const)
      .filter(([, canonical]) => canonical.length > 0),
  );

  const issues: LintIssue[] = [];
  const slugs = getProductSlugs();

  for (const slug of slugs) {
    const product = getProductData(slug);
    const entitlements = resolveProductEntitlements(product.license?.entitlements);
    if (entitlements.length === 0) continue;

    for (const entitlement of entitlements) {
      if (canonical.has(entitlement)) continue;
      const mapped = aliasMap.get(entitlement);
      if (mapped) {
        issues.push({ type: "alias", slug, entitlement, canonicalName: mapped });
      } else {
        issues.push({ type: "unknown", slug, entitlement });
      }
    }
  }

  let hasWarnings = false;
  if (issues.length > 0) {
    const source = response.source ?? "unknown";
    const header =
      source === "catalog"
        ? "Entitlement lint failed."
        : "Entitlement lint warnings (catalog not configured; using fallback source).";
    console.error(header);
    for (const issue of issues) {
      if (issue.type === "alias") {
        console.error(`[alias] ${issue.slug}: ${issue.entitlement} -> ${issue.canonicalName}`);
      } else {
        console.error(`[unknown] ${issue.slug}: ${issue.entitlement}`);
      }
    }
    console.error(`Catalog source: ${source}`);
    if (source === "catalog") {
      process.exit(1);
    }
    hasWarnings = true;
  }

  if (!hasWarnings) {
    console.log(
      `Entitlement lint passed (${slugs.length} products, ${catalog.length} entitlements, ${aliases.length} aliases, source=${response.source ?? "unknown"}).`,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
