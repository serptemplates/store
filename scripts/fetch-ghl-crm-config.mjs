#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";

const root = process.cwd();
dotenv.config({ path: path.resolve(root, ".env") });

const token = process.env.GHL_PAT_LOCATION || process.env.GHL_API_TOKEN;
const locationId = process.env.GHL_LOCATION_ID;
const baseUrl = (process.env.GHL_API_BASE_URL || "https://services.leadconnectorhq.com").replace(/\/$/, "");
const version = process.env.GHL_API_VERSION || "2021-07-28";

if (!token) {
  console.error("⚠️  Missing GHL_PAT_LOCATION (or GHL_API_TOKEN) in environment.");
  process.exit(1);
}

if (!locationId) {
  console.error("⚠️  Missing GHL_LOCATION_ID in environment.");
  process.exit(1);
}

async function ghlGet(pathname, params = {}) {
  const url = new URL(`${baseUrl}${pathname}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      Version: version,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GET ${url.toString()} failed: ${response.status} ${text}`);
  }

  return response.json();
}

async function fetchPipelines() {
  const payload = await ghlGet("/opportunities/pipelines/", { locationId });
  return payload?.pipelines ?? [];
}

async function fetchWorkflows() {
  const payload = await ghlGet("/workflows/", { locationId });
  return payload?.workflows ?? [];
}

async function fetchContactCustomFields() {
  const payload = await ghlGet(`/locations/${locationId}/customFields`, { model: "contact" });
  return payload?.customFields ?? [];
}

async function main() {
  try {
    const [pipelines, workflows, contactCustomFields] = await Promise.all([
      fetchPipelines(),
      fetchWorkflows(),
      fetchContactCustomFields(),
    ]);

    const output = {
      fetchedAt: new Date().toISOString(),
      locationId,
      pipelines,
      workflows,
      contactCustomFields,
    };

    const outPath = path.resolve(root, "ghl-crm-config.json");
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`Saved GHL CRM config snapshot to ${outPath}`);
    console.log(`Pipelines: ${pipelines.length}, Workflows: ${workflows.length}, Contact custom fields: ${contactCustomFields.length}`);
  } catch (error) {
    console.error("❌ Failed to fetch GHL CRM config:", error.message ?? error);
    process.exit(1);
  }
}

await main();
