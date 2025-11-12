#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import stripJsonComments from "strip-json-comments";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../..");
const PRODUCTS_DIR = path.join(REPO_ROOT, "apps/store/data/products");

function isRecord(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function main() {
  const entries = fs.readdirSync(PRODUCTS_DIR, { withFileTypes: true });
  let changed = 0;
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const filePath = path.join(PRODUCTS_DIR, entry.name);
    let json;
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      json = JSON.parse(stripJsonComments(raw));
    } catch (err) {
      console.warn(`Skipping invalid JSON: ${filePath}`);
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(json, "buy_button_destination")) {
      delete json.buy_button_destination;
      fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
      changed += 1;
      console.log(`🧹 Removed buy_button_destination from ${entry.name}`);
    }
  }
  console.log(`\nDone. Updated ${changed} file(s).`);
}

main();
