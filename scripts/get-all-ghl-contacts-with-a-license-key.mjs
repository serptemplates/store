#!/usr/bin/env node

/**
 * Enumerate contacts with license key values across all license key custom fields.
 *
 * Usage:
 *   GHL_API_KEY=... GHL_LOCATION_ID=... node scripts/list-license-contacts.mjs
 *
 * Optional environment variables:
 *   - GHL_API_BASE_URL (defaults to https://rest.gohighlevel.com)
 *   - GHL_API_V1_BASE_URL (defaults based on base URL)
 *   - PAGE_LIMIT (defaults to 200)
 */

import process from 'node:process';
import path from 'node:path';

import { config as loadEnv } from 'dotenv';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

loadEnv({ path: path.resolve(__dirname, '../.env') });

const rawBaseUrl = process.env.GHL_API_BASE_URL?.trim() || 'https://rest.gohighlevel.com';
const baseUrl = rawBaseUrl.replace(/\/$/, '');
const isLeadConnectorHost = baseUrl.includes('leadconnectorhq.com');
const inferredV1Base = isLeadConnectorHost ? baseUrl : `${baseUrl}/v1`;
const apiBaseRoot = (process.env.GHL_API_V1_BASE_URL?.trim() || inferredV1Base).replace(/\/$/, '');
const LICENSE_UNIQUE_KEY_PREFIX = 'contact.license_key';
const PAGE_LIMIT_RAW = Number.parseInt(process.env.PAGE_LIMIT ?? '', 10);
const PAGE_LIMIT = Number.isFinite(PAGE_LIMIT_RAW) && PAGE_LIMIT_RAW > 0
    ? Math.min(PAGE_LIMIT_RAW, 100)
    : 100;

const apiKey = process.env.GHL_API_KEY
    ?? process.env.GHL_PAT_LOCATION
    ?? process.env.GHL_API_TOKEN;
const locationId = process.env.GHL_LOCATION_ID;

if (!apiKey || !locationId) {
    console.error('Set GHL_LOCATION_ID and either GHL_API_KEY or GHL_PAT_LOCATION (or GHL_API_TOKEN).');
    console.error('Current values:', {
        hasLocation: Boolean(locationId),
        hasApiKey: Boolean(process.env.GHL_API_KEY),
        hasPat: Boolean(process.env.GHL_PAT_LOCATION),
        hasApiToken: Boolean(process.env.GHL_API_TOKEN),
    });
    process.exit(1);
}

const baseHeaders = {
	Authorization: `Bearer ${apiKey}`,
	'Content-Type': 'application/json',
	Accept: 'application/json',
	Version: '2021-07-28',
};

function normalizeUniqueKey(raw) {
	if (!raw) return '';
	const trimmed = String(raw).trim();
	if (!trimmed) return '';
	if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
		return trimmed.slice(2, -2).trim();
	}
	return trimmed;
}

function expandIdentifierCandidates(field) {
	const identifiers = new Set();
	const add = (value) => {
		if (value !== undefined && value !== null) {
			const asString = String(value).trim();
			if (asString) {
				identifiers.add(asString);
			}
		}
	};

	add(field.id);
	add(field.key);
	add(field.name);
	add(field.uniqueKey);
	add(field.fieldKey);

	const normalizedKey = normalizeUniqueKey(field.uniqueKey || field.fieldKey);
	add(normalizedKey);

	if (normalizedKey.includes(' ')) {
		add(normalizedKey.replace(/\s+/g, ''));
	}

	if (normalizedKey.includes('.')) {
		const withoutBraces = normalizedKey.replace(/^contact\./, '');
		add(withoutBraces);
		if (withoutBraces.startsWith('license_key_')) {
			add(withoutBraces.replace(/^license_key_/, ''));
		}
	}

	return identifiers;
}

function matchFieldCandidates(candidate, identifiers) {
	if (!candidate) return false;
	const valuesToCheck = [
		candidate.id,
		candidate.key,
		candidate.name,
		candidate.uniqueKey,
		candidate.fieldKey,
	];

	for (const value of valuesToCheck) {
		if (value === undefined || value === null) continue;
		const normalized = String(value).trim();
		if (identifiers.has(normalized)) {
			return true;
		}
	}

	return false;
}

function extractFromContact(contact, field) {
	const identifiers = expandIdentifierCandidates(field);
	const preferredLabel = field.id ?? field.key ?? field.name ?? field.uniqueKey ?? field.fieldKey ?? 'unknown';

	if (Array.isArray(contact?.customField)) {
		for (const entry of contact.customField) {
			if (matchFieldCandidates(entry, identifiers)) {
				return {
					value: entry?.value ?? null,
					location: `customField[${entry?.id ?? entry?.key ?? entry?.name ?? preferredLabel}]`,
				};
			}
		}
	}

	if (contact?.customField && typeof contact.customField === 'object' && !Array.isArray(contact.customField)) {
		for (const [key, value] of Object.entries(contact.customField)) {
			const normalizedKey = String(key).trim();
			if (identifiers.has(normalizedKey)) {
				return {
					value: value ?? null,
					location: `customField.${normalizedKey}`,
				};
			}
		}
	}

	if (Array.isArray(contact?.customFields)) {
		for (const entry of contact.customFields) {
			if (matchFieldCandidates(entry, identifiers)) {
				return {
					value: entry?.value ?? null,
					location: `customFields[${entry?.id ?? entry?.key ?? entry?.name ?? preferredLabel}]`,
				};
			}
		}
	}

	if (contact && typeof contact === 'object') {
		for (const [key, value] of Object.entries(contact)) {
			const normalizedKey = String(key).trim();
			if (identifiers.has(normalizedKey)) {
				return {
					value: value ?? null,
					location: `contact.${normalizedKey}`,
				};
			}
		}
	}

	return null;
}

function normalizeLicenseValue(value) {
	return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

async function fetchAllCustomFields() {
	const response = await fetch(`${baseUrl}/locations/${locationId}/customFields?model=contact`, {
		method: 'GET',
		headers: baseHeaders,
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to fetch custom fields (${response.status}): ${errorText}`);
	}

	const payload = await response.json();
	const items = Array.isArray(payload?.customFields)
		? payload.customFields
		: Array.isArray(payload?.data)
			? payload.data
			: [];

	return items;
}

async function fetchContactsPage(nextUrl) {
	const response = await fetch(nextUrl, {
		method: 'GET',
		headers: baseHeaders,
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to fetch contacts (${response.status}): ${errorText}`);
	}

	return response.json();
}

async function collectContactsWithLicenses(licenseFields) {
	const matches = [];
	let contactsScanned = 0;

	let nextUrl = new URL(`${baseUrl}/contacts/`);
	nextUrl.searchParams.set('locationId', locationId);
	nextUrl.searchParams.set('limit', String(PAGE_LIMIT));

	while (nextUrl) {
		const payload = await fetchContactsPage(nextUrl.toString());
		const contacts = Array.isArray(payload?.contacts) ? payload.contacts : [];
		contactsScanned += contacts.length;

		for (const contact of contacts) {
			const licenseMatches = [];

			for (const field of licenseFields) {
				const extraction = extractFromContact(contact, field);
				if (!extraction) continue;

				const normalizedValue = normalizeLicenseValue(extraction.value);
				if (!normalizedValue) continue;

				licenseMatches.push({
					id: field.id ?? null,
					name: field.name ?? null,
					uniqueKey: normalizeUniqueKey(field.uniqueKey || field.fieldKey) || null,
					value: normalizedValue,
					location: extraction.location,
				});
			}

			if (licenseMatches.length > 0) {
				matches.push({
					id: contact.id ?? null,
					email: contact.email ?? null,
					name: contact.name ?? contact.contactName ?? null,
					licenseFields: licenseMatches,
				});
			}
		}

		const nextPageUrl =
			payload?.meta?.nextPageUrl ||
			payload?.meta?.nextPageURL ||
			payload?.nextPageUrl ||
			null;

		if (nextPageUrl) {
			nextUrl = new URL(nextPageUrl);
		} else {
			nextUrl = null;
		}
	}

	return { matches, contactsScanned };
}

async function main() {
	try {
		const customFields = await fetchAllCustomFields();
		const licenseFields = customFields.filter((field) => {
			const candidates = Array.from(expandIdentifierCandidates(field));
			return candidates.some((candidate) =>
				normalizeUniqueKey(candidate).toLowerCase().startsWith(LICENSE_UNIQUE_KEY_PREFIX)
			);
		});

		if (!licenseFields.length) {
			console.error('No license key custom fields were found for this location.');
			process.exit(1);
		}

		const { matches, contactsScanned } = await collectContactsWithLicenses(licenseFields);

		const result = {
			summary: {
				locationId,
				licenseFieldCount: licenseFields.length,
				contactsScanned,
				contactsWithLicenseValues: matches.length,
			},
			emails: matches
				.map((match) => match.email)
				.filter((email) => typeof email === 'string' && email.trim().length > 0),
			contacts: matches,
		};

		console.log(JSON.stringify(result, null, 2));
	} catch (error) {
		console.error('License contact export failed:', error instanceof Error ? error.message : error);
		process.exit(1);
	}
}

await main();
