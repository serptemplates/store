"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductSlugs = getProductSlugs;
exports.getProductData = getProductData;
exports.getAllProducts = getAllProducts;
exports.getProductJson = getProductJson;
exports.getProductsDataRoot = getProductsDataRoot;
exports.getProductsDirectory = getProductsDirectory;
exports.resolveProductFilePath = resolveProductFilePath;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const strip_json_comments_1 = __importDefault(require("strip-json-comments"));
const product_schema_1 = require("./product-schema");
const site_config_1 = require("@/lib/site-config");
const PRODUCT_DIRECTORY_NAME = "products";
const PRODUCT_FILE_EXTENSION = ".json";
const PRODUCT_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
function resolveDataRoot() {
    const override = process.env.PRODUCTS_ROOT;
    const candidates = [
        override,
        node_path_1.default.join(process.cwd(), "data"),
        node_path_1.default.join(process.cwd(), "apps", "store", "data"),
        node_path_1.default.join(process.cwd(), "..", "data"),
    ].filter((candidate) => Boolean(candidate));
    for (const candidate of candidates) {
        const absolute = node_path_1.default.isAbsolute(candidate) ? candidate : node_path_1.default.resolve(process.cwd(), candidate);
        const productsPath = node_path_1.default.join(absolute, PRODUCT_DIRECTORY_NAME);
        if (node_fs_1.default.existsSync(productsPath)) {
            return absolute;
        }
    }
    const tried = candidates
        .map((candidate) => (node_path_1.default.isAbsolute(candidate) ? candidate : node_path_1.default.resolve(process.cwd(), candidate)))
        .join(", ");
    throw new Error(`Unable to locate product data directory (checked: ${tried || "<none>"}). Set PRODUCTS_ROOT to override.`);
}
const dataRoot = resolveDataRoot();
const productsDir = node_path_1.default.join(dataRoot, PRODUCT_DIRECTORY_NAME);
let cachedSlugs;
const productCache = new Map();
function assertValidProductSlug(slug, allowedSlugs) {
    if (typeof slug !== "string") {
        throw new Error("Product slug must be a string");
    }
    const normalized = slug.trim();
    if (normalized.length === 0) {
        throw new Error("Product slug cannot be empty");
    }
    if (normalized !== slug) {
        throw new Error(`Product slug must not contain leading or trailing whitespace: "${slug}"`);
    }
    if (!PRODUCT_SLUG_PATTERN.test(normalized)) {
        throw new Error(`Product slug "${slug}" contains unsupported characters. Allowed: lowercase letters, numbers, and hyphens.`);
    }
    const candidates = allowedSlugs ?? getProductSlugs();
    if (!candidates.includes(normalized)) {
        throw new Error(`Unknown product slug "${slug}". Expected one of: ${candidates.join(", ")}`);
    }
    return normalized;
}
function readProductFile(filePath) {
    const raw = node_fs_1.default.readFileSync(filePath, "utf8");
    const sanitized = (0, strip_json_comments_1.default)(raw);
    const parsed = JSON.parse(sanitized);
    return product_schema_1.productSchema.parse(parsed);
}
function resolveProductFile(slug) {
    const normalizedSlug = assertValidProductSlug(slug);
    const candidatePath = node_path_1.default.join(productsDir, `${normalizedSlug}${PRODUCT_FILE_EXTENSION}`);
    if (node_fs_1.default.existsSync(candidatePath)) {
        return {
            slug: normalizedSlug,
            absolutePath: candidatePath,
        };
    }
    throw new Error(`Missing product data for slug "${slug}". Expected ${node_path_1.default.relative(process.cwd(), candidatePath)}`);
}
function loadProductFromFile(slug) {
    const resolution = resolveProductFile(slug);
    return readProductFile(resolution.absolutePath);
}
function getProductSlugs() {
    if (!cachedSlugs) {
        if (!node_fs_1.default.existsSync(productsDir)) {
            cachedSlugs = [];
            return cachedSlugs;
        }
        const slugs = new Set();
        for (const file of node_fs_1.default.readdirSync(productsDir)) {
            if (!file.toLowerCase().endsWith(PRODUCT_FILE_EXTENSION)) {
                continue;
            }
            const slug = file.replace(/\.json$/i, "");
            slugs.add(slug);
        }
        cachedSlugs = Array.from(slugs)
            .filter((slug) => !(0, site_config_1.isExcludedSlug)(slug))
            .sort((a, b) => a.localeCompare(b));
    }
    return cachedSlugs;
}
function getProductData(slug) {
    const slugs = getProductSlugs();
    const [firstSlug] = slugs;
    const targetSlug = slug ?? firstSlug;
    if (!targetSlug) {
        throw new Error("No product definitions found under data/products");
    }
    const normalizedSlug = assertValidProductSlug(targetSlug, slugs);
    if (productCache.has(normalizedSlug)) {
        return productCache.get(normalizedSlug);
    }
    const product = loadProductFromFile(normalizedSlug);
    productCache.set(normalizedSlug, product);
    return product;
}
function getAllProducts() {
    return getProductSlugs().map((slug) => getProductData(slug));
}
function getProductJson(slug, indent = 2) {
    const product = getProductData(slug);
    return JSON.stringify(product, null, indent);
}
function getProductsDataRoot() {
    return dataRoot;
}
function getProductsDirectory() {
    return productsDir;
}
function resolveProductFilePath(slug) {
    return resolveProductFile(slug);
}
