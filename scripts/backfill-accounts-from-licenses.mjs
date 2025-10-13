#!/usr/bin/env node

/**
 * Backfill account records in Postgres using the exported GHL license contact list.
 *
 * Usage:
 *   node scripts/backfill-accounts-from-licenses.mjs [path-to-json]
 *
 * The script will:
 *   1. Ensure the `accounts` and `account_verification_tokens` tables exist with the expected schema.
 *   2. Upsert an account row for every contact that has an email address.
 *   3. Preserve existing status/verification data while refreshing the name and updated_at timestamp.
 *
 * Environment:
 *   Reads connection info from DATABASE_URL (falls back to other common env vars).
 *   Automatically loads variables from .env in the repo root if present.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";

const cwdEnvPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(cwdEnvPath)) {
	dotenv.config({ path: cwdEnvPath });
}

const jsonPath = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve("ghl-contacts-with-license-keys.json");

if (!fs.existsSync(jsonPath)) {
	console.error(`JSON file not found: ${jsonPath}`);
	process.exit(1);
}

const connectionString =
	process.env.DATABASE_URL_UNPOOLED ??
	process.env.POSTGRES_URL_NON_POOLING ??
	process.env.POSTGRES_URL ??
	process.env.DATABASE_URL ??
	process.env.POSTGRES_PRISMA_URL ??
	process.env.POSTGRES_URL_NO_SSL ??
	process.env.SUPABASE_DB_URL ??
	"";

if (!connectionString) {
	console.error("DATABASE_URL (or equivalent) is not set. Check your .env configuration.");
	process.exit(1);
}

function normalizeEmail(value) {
	if (!value || typeof value !== "string") return null;
	const trimmed = value.trim().toLowerCase();
	return trimmed.length > 0 ? trimmed : null;
}

function normalizeName(contact) {
	const candidates = [
		typeof contact?.name === "string" ? contact.name : null,
		typeof contact?.contactName === "string" ? contact.contactName : null,
		typeof contact?.firstName === "string" ? contact.firstName : null,
		typeof contact?.lastName === "string" ? contact.lastName : null,
	];

	for (const candidate of candidates) {
		if (!candidate) continue;
		const trimmed = candidate.trim();
		if (trimmed.length > 0) return trimmed;
	}

	return null;
}

let createClientFactory = null;

async function loadCreateClient() {
	if (createClientFactory) return createClientFactory;

	const candidatePaths = [
		"@vercel/postgres",
		path.resolve("apps/store/node_modules/@vercel/postgres/dist/index-node.js"),
		path.resolve("apps/store/node_modules/@vercel/postgres/dist/index.js"),
	];

	const pnpmDir = path.resolve("node_modules/.pnpm");
	if (fs.existsSync(pnpmDir)) {
		const match = fs.readdirSync(pnpmDir).find((entry) => entry.startsWith("@vercel+postgres@"));
		if (match) {
			candidatePaths.push(
				path.join(pnpmDir, match, "node_modules", "@vercel", "postgres", "dist", "index-node.js"),
			);
			candidatePaths.push(
				path.join(pnpmDir, match, "node_modules", "@vercel", "postgres", "dist", "index.js"),
			);
		}
	}

	let lastError = null;

	for (const specifier of candidatePaths) {
		try {
			const mod = await import(specifier);
			if (mod?.createClient) {
				createClientFactory = mod.createClient;
				return createClientFactory;
			}
		} catch (error) {
			lastError = error;
		}
	}

	const fallbackMessage = lastError instanceof Error ? ` (${lastError.message})` : "";
	throw new Error(`Unable to load @vercel/postgres. Ensure dependencies are installed.${fallbackMessage}`);
}

async function ensureAccountSchema(client) {
	await client.sql`
    CREATE TABLE IF NOT EXISTS accounts (
      id UUID PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'disabled')),
      verified_at TIMESTAMPTZ,
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

	await client.sql`
    CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts (status);
  `;

	await client.sql`
    CREATE TABLE IF NOT EXISTS account_verification_tokens (
      id UUID PRIMARY KEY,
      account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
      token_hash TEXT UNIQUE NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

	await client.sql`
    CREATE INDEX IF NOT EXISTS idx_account_verification_tokens_account ON account_verification_tokens (account_id);
  `;

	await client.sql`
    CREATE INDEX IF NOT EXISTS idx_account_verification_tokens_expires ON account_verification_tokens (expires_at);
  `;
}

async function main() {
	const raw = fs.readFileSync(jsonPath, "utf8");
	let parsed;

	try {
		parsed = JSON.parse(raw);
	} catch (error) {
		console.error(`Failed to parse JSON in ${jsonPath}:`, error instanceof Error ? error.message : error);
		process.exit(1);
	}

	const contacts = Array.isArray(parsed?.contacts) ? parsed.contacts : [];

	if (!contacts.length) {
		console.error(`No contacts found in ${jsonPath}.`);
		process.exit(1);
	}

	const createClient = await loadCreateClient();
	const client = createClient({ connectionString });
	await client.connect();

	let inserted = 0;
	let updated = 0;
	let skipped = 0;

	try {
		await ensureAccountSchema(client);
		await client.sql`BEGIN`;

		for (const contact of contacts) {
			const email = normalizeEmail(contact?.email);

			if (!email) {
				skipped += 1;
				continue;
			}

			const name = normalizeName(contact);
			const id = randomUUID();

			const result = await client.sql`
        INSERT INTO accounts (id, email, name, status)
        VALUES (${id}, ${email}, ${name}, 'pending')
        ON CONFLICT (email) DO UPDATE SET
          name = COALESCE(EXCLUDED.name, accounts.name),
          updated_at = NOW()
        RETURNING id, status, verified_at, (xmax = 0) AS inserted;
      `;

			if (result?.rows?.[0]?.inserted) {
				inserted += 1;
			} else {
				updated += 1;
			}
		}

		await client.sql`COMMIT`;
	} catch (error) {
		await client.sql`ROLLBACK`;
		console.error("Backfill failed:", error instanceof Error ? error.message : error);
		process.exitCode = 1;
	} finally {
		await client.end();
	}

	const totalProcessed = inserted + updated + skipped;

	console.log(
		JSON.stringify(
			{
				source: path.basename(jsonPath),
				contactsInFile: contacts.length,
				processed: totalProcessed,
				inserted,
				updated,
				skippedNoEmail: skipped,
			},
			null,
			2,
		),
	);
}

await main();
