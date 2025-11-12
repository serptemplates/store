"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertProducts = convertProducts;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const node_process_1 = __importDefault(require("node:process"));
const node_url_1 = require("node:url");
const strip_json_comments_1 = __importDefault(require("strip-json-comments"));
const product_schema_1 = require("../lib/products/product-schema");
const category_constants_1 = require("../lib/products/category-constants");
const product_1 = require("../lib/products/product");
const PRODUCT_FILE_EXTENSION = ".json";
const LEGAL_FAQ_NORMALIZED_QUESTION = product_schema_1.LEGAL_FAQ_TEMPLATE.question.trim().toLowerCase();
const COMMENT_SECTIONS = [
    {
        comment: "// PRODUCT INFO",
        keys: [
            "platform",
            "name",
            "tagline",
            "slug",
            "trademark_metadata",
            "description",
            "seo_title",
            "seo_description",
            "status",
            "features",
            "faqs",
            "reviews",
            "supported_operating_systems",
            "supported_regions",
            "categories",
            "keywords",
            "layout_type",
            "featured",
            "waitlist_url",
            "new_release",
            "popular",
            "permission_justifications",
            "brand",
            "sku",
        ],
    },
    {
        comment: "// PRODUCT MEDIA",
        keys: [
            "featured_image",
            "featured_image_gif",
            "screenshots",
            "product_videos",
            "related_videos",
            "related_posts",
        ],
    },
    {
        comment: "// PRODUCT PAGE LINKS",
        keys: [
            "serply_link",
            "store_serp_co_product_page_url",
            "apps_serp_co_product_page_url",
            "serp_co_product_page_url",
            "reddit_url",
            "success_url",
            "cancel_url",
            "github_repo_url",
            "github_repo_tags",
            "chrome_webstore_link",
            "firefox_addon_store_link",
            "edge_addons_store_link",
            "opera_addons_store_link",
            "producthunt_link",
            "resource_links",
        ],
    },
    {
        comment: "// PAYMENT DATA",
        keys: ["pricing", "return_policy", "stripe", "ghl", "license"],
    },
];
const REQUIRED_PRODUCT_FIELDS = [
    "name",
    "tagline",
    "slug",
    "trademark_metadata",
    "description",
    "seo_title",
    "seo_description",
    "serply_link",
    "store_serp_co_product_page_url",
    "apps_serp_co_product_page_url",
    "success_url",
    "cancel_url",
];
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function cloneValue(value) {
    if (value === null || typeof value !== "object") {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => cloneValue(item));
    }
    const result = {};
    for (const [key, entry] of Object.entries(value)) {
        if (entry !== undefined) {
            result[key] = cloneValue(entry);
        }
    }
    return result;
}
function orderObject(input, order) {
    const ordered = {};
    const visited = new Set();
    for (const key of order) {
        if (Object.prototype.hasOwnProperty.call(input, key)) {
            const value = input[key];
            if (value !== undefined) {
                ordered[key] = cloneValue(value);
            }
            visited.add(key);
        }
    }
    const remaining = Object.keys(input)
        .filter((key) => !visited.has(key))
        .sort((a, b) => a.localeCompare(b));
    for (const key of remaining) {
        const value = input[key];
        if (value !== undefined) {
            ordered[key] = cloneValue(value);
        }
    }
    return ordered;
}
function orderPlainRecord(input) {
    return orderObject(input, []);
}
function normalizeStripe(stripe) {
    const ordered = orderObject(stripe, product_schema_1.STRIPE_FIELD_ORDER);
    const metadata = ordered.metadata;
    if (isRecord(metadata)) {
        ordered.metadata = orderPlainRecord(metadata);
    }
    return ordered;
}
function normalizeGhl(ghl) {
    const ordered = orderObject(ghl, [
        "pipeline_id",
        "stage_id",
        "status",
        "source",
        "tag_ids",
        "workflow_ids",
        "opportunity_name_template",
        "contact_custom_field_ids",
        "opportunity_custom_field_ids",
    ]);
    const contactFields = ordered.contact_custom_field_ids;
    if (isRecord(contactFields)) {
        ordered.contact_custom_field_ids = orderPlainRecord(contactFields);
    }
    const opportunityFields = ordered.opportunity_custom_field_ids;
    if (isRecord(opportunityFields)) {
        ordered.opportunity_custom_field_ids = orderPlainRecord(opportunityFields);
    }
    return ordered;
}
function ensureLegalFaqArray(value) {
    const faqs = Array.isArray(value) ? value.slice() : [];
    const index = faqs.findIndex((faq) => {
        if (!isRecord(faq))
            return false;
        const question = typeof faq.question === "string" ? faq.question.trim().toLowerCase() : "";
        return question === LEGAL_FAQ_NORMALIZED_QUESTION;
    });
    if (index === -1) {
        faqs.push({ ...product_schema_1.LEGAL_FAQ_TEMPLATE });
        return faqs;
    }
    const entry = isRecord(faqs[index]) ? faqs[index] : {};
    const currentQuestion = entry.question;
    const currentAnswer = entry.answer;
    if (currentQuestion === product_schema_1.LEGAL_FAQ_TEMPLATE.question && currentAnswer === product_schema_1.LEGAL_FAQ_TEMPLATE.answer) {
        return faqs;
    }
    faqs[index] = {
        ...entry,
        question: product_schema_1.LEGAL_FAQ_TEMPLATE.question,
        answer: product_schema_1.LEGAL_FAQ_TEMPLATE.answer,
    };
    return faqs;
}
function ensureLegalFaq(product) {
    const faqs = Array.isArray(product.faqs) ? product.faqs : [];
    const index = faqs.findIndex((faq) => {
        const question = typeof faq?.question === "string" ? faq.question.trim().toLowerCase() : "";
        return question === LEGAL_FAQ_NORMALIZED_QUESTION;
    });
    if (index === -1) {
        return {
            ...product,
            faqs: [...faqs, { ...product_schema_1.LEGAL_FAQ_TEMPLATE }],
        };
    }
    const current = faqs[index] ?? {};
    if (current.question === product_schema_1.LEGAL_FAQ_TEMPLATE.question
        && current.answer === product_schema_1.LEGAL_FAQ_TEMPLATE.answer) {
        return product;
    }
    const nextFaqs = [...faqs];
    nextFaqs[index] = {
        ...current,
        question: product_schema_1.LEGAL_FAQ_TEMPLATE.question,
        answer: product_schema_1.LEGAL_FAQ_TEMPLATE.answer,
    };
    return {
        ...product,
        faqs: nextFaqs,
    };
}
function normalizeProduct(product) {
    const prepared = ensureLegalFaq(product);
    const normalized = {};
    for (const key of product_schema_1.PRODUCT_FIELD_ORDER) {
        const value = prepared[key];
        if (value === undefined) {
            continue;
        }
        switch (key) {
            case "success_url": {
                const rawUrl = String(value);
                try {
                    const url = new URL(rawUrl);
                    // Drop placeholder-only session_id param
                    const sid = url.searchParams.get("session_id");
                    if (sid === "{CHECKOUT_SESSION_ID}") {
                        url.searchParams.delete("session_id");
                    }
                    const serialized = url.searchParams.toString();
                    const withoutQuery = `${url.origin}${url.pathname}`;
                    normalized[key] = serialized ? `${withoutQuery}?${serialized}` : withoutQuery;
                }
                catch {
                    // If not a valid URL, pass through unchanged
                    normalized[key] = cloneValue(value);
                }
                break;
            }
            case "screenshots": {
                const screenshots = value;
                normalized[key] = screenshots.map((shot) => orderObject(shot, product_schema_1.SCREENSHOT_FIELD_ORDER));
                break;
            }
            case "faqs": {
                const faqs = value;
                normalized[key] = faqs.map((faq) => orderObject(faq, product_schema_1.FAQ_FIELD_ORDER));
                break;
            }
            case "reviews": {
                const reviews = value;
                normalized[key] = reviews.map((review) => orderObject(review, product_schema_1.REVIEW_FIELD_ORDER));
                break;
            }
            case "permission_justifications": {
                const permissions = value;
                normalized[key] = permissions.map((entry) => orderObject(entry, product_schema_1.PERMISSION_JUSTIFICATION_FIELD_ORDER));
                break;
            }
            case "trademark_metadata": {
                const metadata = value;
                normalized[key] = orderObject(metadata, product_schema_1.TRADEMARK_METADATA_FIELD_ORDER);
                break;
            }
            case "pricing": {
                const pricing = value;
                normalized[key] = orderObject(pricing, product_schema_1.PRICING_FIELD_ORDER);
                break;
            }
            case "return_policy": {
                const policy = value;
                normalized[key] = orderObject(policy, product_schema_1.RETURN_POLICY_FIELD_ORDER);
                break;
            }
            case "categories": {
                const categories = value ?? [];
                const allAccepted = category_constants_1.ACCEPTED_CATEGORIES;
                const acceptedLower = new Map(allAccepted.map((c) => [c.toLowerCase(), c]));
                const synonyms = category_constants_1.CATEGORY_SYNONYMS;
                const seen = new Set();
                const out = [];
                for (const label of categories) {
                    if (typeof label !== "string")
                        continue;
                    const lower = label.trim().toLowerCase();
                    if (!lower)
                        continue;
                    const mapped = synonyms[lower] ?? acceptedLower.get(lower);
                    if (mapped && !seen.has(mapped.toLowerCase())) {
                        seen.add(mapped.toLowerCase());
                        out.push(mapped);
                    }
                }
                if (out.length > 0) {
                    normalized[key] = out;
                }
                break;
            }
            case "stripe": {
                const stripe = value;
                normalized[key] = normalizeStripe(stripe);
                break;
            }
            case "ghl": {
                const ghl = value;
                normalized[key] = normalizeGhl(ghl);
                break;
            }
            default:
                normalized[key] = cloneValue(value);
                break;
        }
    }
    return normalized;
}
function collectWarnings(raw, product, sourceSlug) {
    const warnings = [];
    const rawKeys = Object.keys(raw);
    const unrecognised = rawKeys.filter((key) => !product_schema_1.PRODUCT_FIELD_ORDER.includes(key));
    if (unrecognised.length > 0) {
        warnings.push(`Unrecognised fields: ${unrecognised.sort((a, b) => a.localeCompare(b)).join(", ")}`);
    }
    const missingRequired = REQUIRED_PRODUCT_FIELDS.filter((field) => raw[field] === undefined) ?? [];
    if (missingRequired.length > 0) {
        warnings.push(`Missing required fields: ${missingRequired.join(", ")}`);
    }
    const rawTrademarkMetadata = raw.trademark_metadata;
    if (rawTrademarkMetadata && !isRecord(rawTrademarkMetadata)) {
        warnings.push("trademark_metadata must be an object");
    }
    else if (isRecord(rawTrademarkMetadata)) {
        const usesTrademarkedBrand = rawTrademarkMetadata.uses_trademarked_brand;
        if (typeof usesTrademarkedBrand !== "boolean") {
            warnings.push("trademark_metadata.uses_trademarked_brand must be a boolean");
        }
        else if (usesTrademarkedBrand) {
            const tradeName = rawTrademarkMetadata.trade_name;
            const legalEntity = rawTrademarkMetadata.legal_entity;
            if (typeof tradeName !== "string" || tradeName.trim().length === 0) {
                warnings.push("trade_name is required when uses_trademarked_brand is true");
            }
            if (typeof legalEntity !== "string" || legalEntity.trim().length === 0) {
                warnings.push("legal_entity is required when uses_trademarked_brand is true");
            }
        }
        else {
            if (typeof rawTrademarkMetadata.trade_name === "string" && rawTrademarkMetadata.trade_name.trim().length > 0) {
                warnings.push("trade_name should be omitted when uses_trademarked_brand is false");
            }
            if (typeof rawTrademarkMetadata.legal_entity === "string" && rawTrademarkMetadata.legal_entity.trim().length > 0) {
                warnings.push("legal_entity should be omitted when uses_trademarked_brand is false");
            }
        }
    }
    if (product.slug !== sourceSlug) {
        warnings.push(`Slug mismatch (file "${sourceSlug}" vs schema "${product.slug}")`);
    }
    return warnings;
}
function formatZodError(error) {
    if (!error || typeof error !== "object" || !("issues" in error)) {
        return String(error);
    }
    const issues = error.issues;
    if (!Array.isArray(issues)) {
        return String(error);
    }
    return issues
        .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "<root>";
        return `${path}: ${issue.message}`;
    })
        .join("; ");
}
async function listAllJsonSources(productsDir) {
    const entries = await promises_1.default.readdir(productsDir, { withFileTypes: true });
    return entries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(PRODUCT_FILE_EXTENSION))
        .map((entry) => {
        const slug = entry.name.replace(/\.json$/i, "");
        return { slug, jsonPath: node_path_1.default.join(productsDir, entry.name) };
    })
        .sort((a, b) => a.slug.localeCompare(b.slug));
}
async function readJsonFile(filePath) {
    const raw = await promises_1.default.readFile(filePath, "utf8");
    let parsed;
    try {
        parsed = JSON.parse((0, strip_json_comments_1.default)(raw));
    }
    catch (error) {
        throw new Error(`JSON parse error - ${error.message}`);
    }
    return { raw, data: parsed };
}
function insertSectionComments(source) {
    return COMMENT_SECTIONS.reduce((acc, section) => addSectionComment(acc, section), source);
}
function addSectionComment(source, section) {
    const markerKey = section.keys.find((key) => source.includes(`"${key}":`));
    if (!markerKey) {
        return source;
    }
    const marker = `"${markerKey}":`;
    const markerIndex = source.indexOf(marker);
    if (markerIndex === -1) {
        return source;
    }
    const lineStart = source.lastIndexOf("\n", markerIndex);
    const insertPosition = lineStart === -1 ? 0 : lineStart + 1;
    const indentationMatch = source.slice(insertPosition, markerIndex).match(/^\s*/);
    const indentation = indentationMatch ? indentationMatch[0] : "";
    const commentLine = `${indentation}${section.comment}\n`;
    if (source.slice(insertPosition, insertPosition + commentLine.length) === commentLine) {
        return source;
    }
    return `${source.slice(0, insertPosition)}${commentLine}${source.slice(insertPosition)}`;
}
async function convertSingleProduct(source, options) {
    try {
        const { raw, data } = await readJsonFile(source.jsonPath);
        if (!isRecord(data)) {
            throw new Error("Expected the JSON file to contain an object");
        }
        // Pre-validate normalization: map category synonyms to accepted labels
        const prepped = (() => {
            if (!isRecord(data))
                return data;
            const copy = { ...data };
            const categories = Array.isArray(copy.categories) ? copy.categories : null;
            if (categories) {
                const synonyms = category_constants_1.CATEGORY_SYNONYMS;
                copy.categories = categories.map((v) => {
                    if (typeof v !== "string")
                        return v;
                    const lower = v.trim().toLowerCase();
                    return synonyms[lower] ?? v;
                });
            }
            copy.faqs = ensureLegalFaqArray(copy.faqs);
            return copy;
        })();
        const parsed = product_schema_1.productSchema.safeParse(prepped);
        if (!parsed.success) {
            throw new Error(formatZodError(parsed.error));
        }
        const product = parsed.data;
        const warnings = collectWarnings(data, product, source.slug);
        const normalized = normalizeProduct(product);
        const outputPath = source.jsonPath;
        const formattedJson = JSON.stringify(normalized, null, 2);
        const withComments = insertSectionComments(formattedJson);
        const nextContent = `${withComments}\n`;
        const hasChanges = nextContent !== raw;
        if (options.dryRun || options.check) {
            return {
                slug: product.slug,
                sourcePath: source.jsonPath,
                outputPath,
                warnings,
                status: "dry-run",
                changed: hasChanges,
            };
        }
        if (!hasChanges) {
            return {
                slug: product.slug,
                sourcePath: source.jsonPath,
                outputPath,
                warnings,
                status: "skipped-unchanged",
                changed: false,
            };
        }
        await promises_1.default.writeFile(outputPath, nextContent, "utf8");
        return {
            slug: product.slug,
            sourcePath: source.jsonPath,
            outputPath,
            warnings,
            status: "written",
            changed: true,
        };
    }
    catch (error) {
        return {
            slug: source.slug,
            sourcePath: source.jsonPath,
            outputPath: source.jsonPath,
            warnings: [],
            status: "failed",
            changed: false,
            error: error instanceof Error ? error : new Error(String(error)),
        };
    }
}
async function convertProducts(options = {}) {
    const productsDir = (0, product_1.getProductsDirectory)();
    const dryRun = options.dryRun ?? false;
    const check = options.check ?? false;
    const outcomes = [];
    const requestedSlugs = options.slugs && options.slugs.length > 0 ? options.slugs : null;
    if (requestedSlugs) {
        for (const slug of requestedSlugs) {
            const sourcePath = node_path_1.default.join(productsDir, `${slug}${PRODUCT_FILE_EXTENSION}`);
            const source = { slug, jsonPath: sourcePath };
            const outcome = await convertSingleProduct(source, { dryRun, check });
            outcomes.push(outcome);
        }
    }
    else {
        const sources = await listAllJsonSources(productsDir);
        for (const source of sources) {
            const outcome = await convertSingleProduct(source, { dryRun, check });
            outcomes.push(outcome);
        }
    }
    const errorCount = outcomes.filter((outcome) => outcome.status === "failed").length;
    const warningCount = outcomes.reduce((total, outcome) => total + outcome.warnings.length, 0);
    const changedCount = outcomes.filter((outcome) => outcome.changed).length;
    return {
        outcomes,
        errors: errorCount,
        warnings: warningCount,
        changed: changedCount,
    };
}
function parseArgs(argv) {
    const slugs = [];
    let dryRun = false;
    let check = false;
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        switch (arg) {
            case "--slug":
            case "-s": {
                const value = argv[index + 1];
                if (!value || value.startsWith("-")) {
                    throw new Error(`${arg} requires a slug argument`);
                }
                slugs.push(value);
                index += 1;
                break;
            }
            case "--dry-run": {
                dryRun = true;
                break;
            }
            case "--check": {
                check = true;
                dryRun = true;
                break;
            }
            default:
                throw new Error(`Unknown argument: ${arg}`);
        }
    }
    return {
        slugs: slugs.length > 0 ? slugs : null,
        dryRun,
        check,
    };
}
async function runCli() {
    try {
        const options = parseArgs(node_process_1.default.argv.slice(2));
        const summary = await convertProducts(options);
        summary.outcomes.forEach((outcome) => {
            outcome.warnings.forEach((warning) => {
                console.warn(`⚠️  [${outcome.slug}] ${warning}`);
            });
            if (outcome.status === "failed" && outcome.error) {
                console.error(`❌ ${outcome.sourcePath}: ${outcome.error.message}`);
            }
            else if (options.check && outcome.changed) {
                console.warn(`⚠️  ${outcome.sourcePath} would be reformatted.`);
            }
            else if (outcome.status === "written" && outcome.changed) {
                console.log(`📝 ${outcome.sourcePath} reformatted.`);
            }
        });
        if (summary.errors > 0) {
            console.error(`\nProduct normalization failed with ${summary.errors} error(s).`);
            node_process_1.default.exit(1);
        }
        if (options.check && summary.changed > 0) {
            console.error(`\n${summary.changed} product file(s) require normalization. Run "pnpm --filter @apps/store convert:products" to fix.`);
            node_process_1.default.exit(1);
        }
        const modeLabel = options.check ? "checked" : options.dryRun ? "previewed" : "normalized";
        console.log(`✅ ${modeLabel} ${summary.outcomes.length} product definition(s) ${summary.changed > 0 ? `(changed: ${summary.changed})` : ""}`);
    }
    catch (error) {
        console.error("Unexpected error during product normalization:", error);
        node_process_1.default.exit(1);
    }
}
const invokedDirectly = typeof node_process_1.default.argv[1] === "string"
    ? import.meta.url === (0, node_url_1.pathToFileURL)(node_path_1.default.resolve(node_process_1.default.argv[1])).href
    : false;
if (invokedDirectly) {
    runCli();
}
