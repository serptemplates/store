import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import stripJsonComments from "strip-json-comments";

import {
  FAQ_FIELD_ORDER,
  LEGAL_FAQ_TEMPLATE,
  PERMISSION_JUSTIFICATION_FIELD_ORDER,
  PRICING_FIELD_ORDER,
  PRODUCT_FIELD_ORDER,
  RETURN_POLICY_FIELD_ORDER,
  REVIEW_FIELD_ORDER,
  SCREENSHOT_FIELD_ORDER,
  STRIPE_FIELD_ORDER,
  TRADEMARK_METADATA_FIELD_ORDER,
  type ProductData,
  productSchema,
} from "../lib/products/product-schema";
import { resolveSeoDescription, resolveSeoTitle } from "../lib/products/unofficial-branding";
import { ACCEPTED_CATEGORIES, CATEGORY_SYNONYMS } from "../lib/products/category-constants";
import { getProductsDirectory } from "../lib/products/product";

const PRODUCT_FILE_EXTENSION = ".json";
const LEGAL_FAQ_NORMALIZED_QUESTION = LEGAL_FAQ_TEMPLATE.question.trim().toLowerCase();

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
] as const;

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
] as const;

type RequiredProductField = (typeof REQUIRED_PRODUCT_FIELDS)[number];

type ConvertProductsOptions = {
  slugs?: string[] | null;
  dryRun?: boolean;
  check?: boolean;
};

type ConversionOutcomeStatus = "written" | "dry-run" | "skipped-unchanged" | "failed";

export type ConversionOutcome = {
  slug: string;
  sourcePath: string;
  outputPath: string;
  warnings: string[];
  status: ConversionOutcomeStatus;
  changed: boolean;
  error?: Error;
};

export type ConversionSummary = {
  outcomes: ConversionOutcome[];
  errors: number;
  warnings: number;
  changed: number;
};

type SourceFile = {
  slug: string;
  jsonPath: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneValue<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (entry !== undefined) {
      result[key] = cloneValue(entry);
    }
  }
  return result as T;
}

function orderObject<T extends Record<string, unknown>>(input: T, order: readonly string[]): Record<string, unknown> {
  const ordered: Record<string, unknown> = {};
  const visited = new Set<string>();

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

function orderPlainRecord(input: Record<string, unknown>): Record<string, unknown> {
  return orderObject(input, []);
}

function normalizeStripe(stripe: NonNullable<ProductData["stripe"]>): Record<string, unknown> {
  const ordered = orderObject(stripe as Record<string, unknown>, STRIPE_FIELD_ORDER);
  const metadata = ordered.metadata;

  if (isRecord(metadata)) {
    ordered.metadata = orderPlainRecord(metadata);
  }

  return ordered;
}

function normalizeGhl(ghl: NonNullable<ProductData["ghl"]>): Record<string, unknown> {
  const ordered = orderObject(ghl as Record<string, unknown>, [
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

function ensureLegalFaqArray(value: unknown): Array<Record<string, unknown>> {
  const faqs = Array.isArray(value) ? value.slice() : [];
  const index = faqs.findIndex((faq) => {
    if (!isRecord(faq)) return false;
    const question = typeof faq.question === "string" ? faq.question.trim().toLowerCase() : "";
    return question === LEGAL_FAQ_NORMALIZED_QUESTION;
  });

  if (index === -1) {
    faqs.push({ ...LEGAL_FAQ_TEMPLATE });
    return faqs as Array<Record<string, unknown>>;
  }

  const entry = isRecord(faqs[index]) ? (faqs[index] as Record<string, unknown>) : {};
  const currentQuestion = entry.question;
  const currentAnswer = entry.answer;
  if (currentQuestion === LEGAL_FAQ_TEMPLATE.question && currentAnswer === LEGAL_FAQ_TEMPLATE.answer) {
    return faqs as Array<Record<string, unknown>>;
  }

  faqs[index] = {
    ...entry,
    question: LEGAL_FAQ_TEMPLATE.question,
    answer: LEGAL_FAQ_TEMPLATE.answer,
  };

  return faqs as Array<Record<string, unknown>>;
}

function applyUnofficialBranding(product: ProductData): ProductData {
  const titleBase = product.seo_title?.trim() || product.name.trim();
  const descriptionBase = product.seo_description?.trim() || undefined;
  const updatedTitle = resolveSeoTitle(product, titleBase);
  const updatedDescription = resolveSeoDescription(product, descriptionBase);

  return {
    ...product,
    seo_title: updatedTitle,
    seo_description: updatedDescription,
  };
}

function ensureLegalFaq(product: ProductData): ProductData {
  const faqs = Array.isArray(product.faqs) ? product.faqs : [];
  const index = faqs.findIndex((faq) => {
    const question = typeof faq?.question === "string" ? faq.question.trim().toLowerCase() : "";
    return question === LEGAL_FAQ_NORMALIZED_QUESTION;
  });

  if (index === -1) {
    return {
      ...product,
      faqs: [...faqs, { ...LEGAL_FAQ_TEMPLATE }],
    };
  }

  const current = faqs[index] ?? {};
  if (
    current.question === LEGAL_FAQ_TEMPLATE.question
    && current.answer === LEGAL_FAQ_TEMPLATE.answer
  ) {
    return product;
  }

  const nextFaqs = [...faqs];
  nextFaqs[index] = {
    ...current,
    question: LEGAL_FAQ_TEMPLATE.question,
    answer: LEGAL_FAQ_TEMPLATE.answer,
  };

  return {
    ...product,
    faqs: nextFaqs,
  };
}

function normalizeProduct(product: ProductData): Record<string, unknown> {
  const prepared = ensureLegalFaq(product);
  const normalized: Record<string, unknown> = {};

  for (const key of PRODUCT_FIELD_ORDER) {
    const value = prepared[key as keyof ProductData];
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
        } catch {
          // If not a valid URL, pass through unchanged
          normalized[key] = cloneValue(value);
        }
        break;
      }
      case "screenshots": {
        const screenshots = value as NonNullable<ProductData["screenshots"]>;
        normalized[key] = screenshots.map((shot) =>
          orderObject(shot as Record<string, unknown>, SCREENSHOT_FIELD_ORDER),
        );
        break;
      }
      case "faqs": {
        const faqs = value as NonNullable<ProductData["faqs"]>;
        normalized[key] = faqs.map((faq) => orderObject(faq as Record<string, unknown>, FAQ_FIELD_ORDER));
        break;
      }
      case "reviews": {
        const reviews = value as NonNullable<ProductData["reviews"]>;
        normalized[key] = reviews.map((review) =>
          orderObject(review as Record<string, unknown>, REVIEW_FIELD_ORDER),
        );
        break;
      }
      case "permission_justifications": {
        const permissions = value as NonNullable<ProductData["permission_justifications"]>;
        normalized[key] = permissions.map((entry) =>
          orderObject(entry as Record<string, unknown>, PERMISSION_JUSTIFICATION_FIELD_ORDER),
        );
        break;
      }
      case "trademark_metadata": {
        const metadata = value as ProductData["trademark_metadata"];
        normalized[key] = orderObject(metadata as Record<string, unknown>, TRADEMARK_METADATA_FIELD_ORDER);
        break;
      }
      case "pricing": {
        const pricing = value as NonNullable<ProductData["pricing"]>;
        normalized[key] = orderObject(pricing as Record<string, unknown>, PRICING_FIELD_ORDER);
        break;
      }
      case "return_policy": {
        const policy = value as NonNullable<ProductData["return_policy"]>;
        normalized[key] = orderObject(policy as Record<string, unknown>, RETURN_POLICY_FIELD_ORDER);
        break;
      }
      case "categories": {
        const categories = (value as string[] | undefined) ?? [];
        const allAccepted: readonly string[] = ACCEPTED_CATEGORIES as unknown as readonly string[];
        const acceptedLower = new Map(allAccepted.map((c) => [c.toLowerCase(), c] as const));
        const synonyms = CATEGORY_SYNONYMS;
        const seen = new Set<string>();
        const out: string[] = [];
        for (const label of categories) {
          if (typeof label !== "string") continue;
          const lower = label.trim().toLowerCase();
          if (!lower) continue;
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
        const stripe = value as NonNullable<ProductData["stripe"]>;
        normalized[key] = normalizeStripe(stripe);
        break;
      }
      case "ghl": {
        const ghl = value as NonNullable<ProductData["ghl"]>;
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

function collectWarnings(raw: Record<string, unknown>, product: ProductData, sourceSlug: string): string[] {
  const warnings: string[] = [];

  const rawKeys = Object.keys(raw);
  const unrecognised = rawKeys.filter((key) => !PRODUCT_FIELD_ORDER.includes(key as (typeof PRODUCT_FIELD_ORDER)[number]));

  if (unrecognised.length > 0) {
    warnings.push(`Unrecognised fields: ${unrecognised.sort((a, b) => a.localeCompare(b)).join(", ")}`);
  }

  const missingRequired = (REQUIRED_PRODUCT_FIELDS.filter((field) => raw[field] === undefined) as RequiredProductField[]) ?? [];
  if (missingRequired.length > 0) {
    warnings.push(`Missing required fields: ${missingRequired.join(", ")}`);
  }

  const rawTrademarkMetadata = raw.trademark_metadata;
  if (rawTrademarkMetadata && !isRecord(rawTrademarkMetadata)) {
    warnings.push("trademark_metadata must be an object");
  } else if (isRecord(rawTrademarkMetadata)) {
    const usesTrademarkedBrand = rawTrademarkMetadata.uses_trademarked_brand;
    if (typeof usesTrademarkedBrand !== "boolean") {
      warnings.push("trademark_metadata.uses_trademarked_brand must be a boolean");
    } else if (usesTrademarkedBrand) {
      const tradeName = rawTrademarkMetadata.trade_name;
      const legalEntity = rawTrademarkMetadata.legal_entity;
      if (typeof tradeName !== "string" || tradeName.trim().length === 0) {
        warnings.push("trade_name is required when uses_trademarked_brand is true");
      }
      if (typeof legalEntity !== "string" || legalEntity.trim().length === 0) {
        warnings.push("legal_entity is required when uses_trademarked_brand is true");
      }
    } else {
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

function formatZodError(error: unknown): string {
  if (!error || typeof error !== "object" || !("issues" in error)) {
    return String(error);
  }

  const issues = (error as { issues?: Array<{ path: Array<string | number>; message: string }> }).issues;
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

async function listAllJsonSources(productsDir: string): Promise<SourceFile[]> {
  const entries = await fs.readdir(productsDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(PRODUCT_FILE_EXTENSION))
    .map((entry) => {
      const slug = entry.name.replace(/\.json$/i, "");
      return { slug, jsonPath: path.join(productsDir, entry.name) };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

async function readJsonFile(filePath: string): Promise<{ raw: string; data: unknown }> {
  const raw = await fs.readFile(filePath, "utf8");
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripJsonComments(raw));
  } catch (error) {
    throw new Error(`JSON parse error - ${(error as Error).message}`);
  }

  return { raw, data: parsed };
}

type CommentSection = {
  comment: string;
  keys: readonly string[];
};

function insertSectionComments(source: string): string {
  return COMMENT_SECTIONS.reduce((acc, section) => addSectionComment(acc, section), source);
}

function addSectionComment(source: string, section: CommentSection): string {
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

async function convertSingleProduct(
  source: SourceFile,
  options: Required<Pick<ConvertProductsOptions, "dryRun" | "check">>,
): Promise<ConversionOutcome> {
  try {
    const { raw, data } = await readJsonFile(source.jsonPath);

    if (!isRecord(data)) {
      throw new Error("Expected the JSON file to contain an object");
    }

    // Pre-validate normalization: map category synonyms to accepted labels
    const prepped = (() => {
      if (!isRecord(data)) return data;
      const copy: Record<string, unknown> = { ...data };
      const categories = Array.isArray(copy.categories) ? (copy.categories as unknown[]) : null;
      if (categories) {
        const synonyms = CATEGORY_SYNONYMS as Record<string, string>;
        copy.categories = categories.map((v) => {
          if (typeof v !== "string") return v;
          const lower = v.trim().toLowerCase();
          return synonyms[lower] ?? v;
        });
      }
      copy.faqs = ensureLegalFaqArray(copy.faqs);
      return copy;
    })();

    const parsed = productSchema.safeParse(prepped);
    if (!parsed.success) {
      throw new Error(formatZodError(parsed.error));
    }

    const product = applyUnofficialBranding(parsed.data);
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

    await fs.writeFile(outputPath, nextContent, "utf8");

    return {
      slug: product.slug,
      sourcePath: source.jsonPath,
      outputPath,
      warnings,
      status: "written",
      changed: true,
    };
  } catch (error) {
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

export async function convertProducts(options: ConvertProductsOptions = {}): Promise<ConversionSummary> {
  const productsDir = getProductsDirectory();
  const dryRun = options.dryRun ?? false;
  const check = options.check ?? false;

  const outcomes: ConversionOutcome[] = [];

  const requestedSlugs = options.slugs && options.slugs.length > 0 ? options.slugs : null;

  if (requestedSlugs) {
    for (const slug of requestedSlugs) {
      const sourcePath = path.join(productsDir, `${slug}${PRODUCT_FILE_EXTENSION}`);
      const source = { slug, jsonPath: sourcePath };
      const outcome = await convertSingleProduct(source, { dryRun, check });
      outcomes.push(outcome);
    }
  } else {
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

function parseArgs(argv: string[]): Required<ConvertProductsOptions> {
  const slugs: string[] = [];
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
    const options = parseArgs(process.argv.slice(2));
    const summary = await convertProducts(options);

    summary.outcomes.forEach((outcome) => {
      outcome.warnings.forEach((warning) => {
        console.warn(`⚠️  [${outcome.slug}] ${warning}`);
      });
      if (outcome.status === "failed" && outcome.error) {
        console.error(`❌ ${outcome.sourcePath}: ${outcome.error.message}`);
      } else if (options.check && outcome.changed) {
        console.warn(`⚠️  ${outcome.sourcePath} would be reformatted.`);
      } else if (outcome.status === "written" && outcome.changed) {
        console.log(`📝 ${outcome.sourcePath} reformatted.`);
      }
    });

    if (summary.errors > 0) {
      console.error(`\nProduct normalization failed with ${summary.errors} error(s).`);
      process.exit(1);
    }

    if (options.check && summary.changed > 0) {
      console.error(
        `\n${summary.changed} product file(s) require normalization. Run "pnpm --filter @apps/store convert:products" to fix.`,
      );
      process.exit(1);
    }

    const modeLabel = options.check ? "checked" : options.dryRun ? "previewed" : "normalized";
    console.log(
      `✅ ${modeLabel} ${summary.outcomes.length} product definition(s) ${summary.changed > 0 ? `(changed: ${summary.changed})` : ""}`,
    );
  } catch (error) {
    console.error("Unexpected error during product normalization:", error);
    process.exit(1);
  }
}

const invokedDirectly =
  typeof process.argv[1] === "string"
    ? import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
    : false;

if (invokedDirectly) {
  runCli();
}
