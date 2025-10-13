#!/usr/bin/env node

/**
 * Produce a rollup summary of license-bearing contacts per product.
 *
 * Usage:
 *   node scripts/report-accounts-with-licenses.mjs /path/to/ghl-contacts-with-license-keys.json
 *
 * The JSON should match the schema returned by list-license-contacts.mjs.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const inputPath = process.argv[2];
if (!inputPath) {
	console.error("Usage: node scripts/report-accounts-with-licenses.mjs <path-to-json>");
	process.exit(1);
}

const resolvedPath = path.resolve(process.cwd(), inputPath);

let parsed;
try {
	const raw = fs.readFileSync(resolvedPath, "utf8");
	parsed = JSON.parse(raw);
} catch (error) {
	console.error(`Failed to read or parse ${resolvedPath}:`, error instanceof Error ? error.message : error);
	process.exit(1);
}

const contacts = Array.isArray(parsed?.contacts) ? parsed.contacts : [];

const productCounts = new Map();
const emailToLicenses = new Map();

const normalizeString = (value) => (typeof value === "string" ? value.trim() : "");

for (const contact of contacts) {
	const email = normalizeString(contact?.email);
	if (!email) {
		continue;
	}

	const licenseFields = Array.isArray(contact?.licenseFields) ? contact.licenseFields : [];
	const nonEmptyFields = licenseFields.filter((field) => normalizeString(field?.value).length > 0);

	if (nonEmptyFields.length === 0) continue;

	const productsForContact = new Set();

	for (const field of nonEmptyFields) {
		const key = normalizeString(field?.uniqueKey) || normalizeString(field?.id);
		if (!key) continue;

		const productSlug = key.replace(/^contact\.license_key_?/i, "").replace(/_/g, "-");
		productsForContact.add(productSlug || key);
		productCounts.set(productSlug || key, (productCounts.get(productSlug || key) ?? 0) + 1);
	}

	emailToLicenses.set(email, {
		contactId: contact.id ?? null,
		licenses: Array.from(productsForContact),
	});
}

const totalContacts = contacts.length;
const contactsWithLicenses = emailToLicenses.size;

const sortedProducts = Array.from(productCounts.entries()).sort((a, b) => b[1] - a[1]);

const result = {
	summary: {
		source: path.basename(resolvedPath),
		contactsProcessed: totalContacts,
		contactsWithLicenseValues: contactsWithLicenses,
		productsRepresented: sortedProducts.length,
	},
	productBreakdown: sortedProducts.map(([product, count]) => ({
		product,
		count,
	})),
	accounts: Array.from(emailToLicenses.entries()).map(([email, info]) => ({
		email,
		contactId: info.contactId,
		licenses: info.licenses,
	})),
};

console.log(JSON.stringify(result, null, 2));
