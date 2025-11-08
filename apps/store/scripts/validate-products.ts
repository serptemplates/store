import { promises as fs } from "fs"
import path from "path"
import { pathToFileURL } from "url"
import Stripe from "stripe"
import dotenv from "dotenv"
import { productSchema, type ProductData } from "../lib/products/product-schema"
import { isPreRelease } from "../lib/products/release-status"
import {
  getProductsDataRoot,
  getProductsDirectory,
  resolveProductFilePath,
  type ProductFileResolution,
} from "../lib/products/product"

// Load env files from the package directory and fallback to the repository root.
const envFilenames = [".env"] as const
const envSearchRoots = [
  process.cwd(),
  path.resolve(process.cwd(), ".."),
  path.resolve(process.cwd(), "..", ".."),
] as const

for (const root of envSearchRoots) {
  for (const filename of envFilenames) {
    dotenv.config({ path: path.join(root, filename), override: false })
  }
}

const STRIPE_API_VERSION = "2024-04-10"

const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
])

type StripeClientConfig = { stripe: Stripe }

const BADGE_FLAGS: Array<"pre_release" | "new_release" | "popular"> = [
  "pre_release",
  "new_release",
  "popular",
]

const REMOTE_URL_PATTERN = /^https?:\/\//i
const ASSET_CHECK_TIMEOUT_MS = 8000

type AssetReference = {
  field: string
  url: string
}

export type ProductAssetCheckFailure = {
  slug: string
  file: string
  field: string
  url: string
  status?: number
  reason: string
}

function collectAssetReferences(product: ProductData): AssetReference[] {
  const references: AssetReference[] = []
  const seen = new Set<string>()

  const add = (candidate: unknown, field: string) => {
    if (typeof candidate !== "string") {
      return
    }
    const trimmed = candidate.trim()
    if (!trimmed || !REMOTE_URL_PATTERN.test(trimmed)) {
      return
    }
    const key = `${field}:${trimmed}`
    if (seen.has(key)) {
      return
    }
    seen.add(key)
    references.push({ field, url: trimmed })
  }

  add(product.featured_image, "featured_image")
  add(product.featured_image_gif, "featured_image_gif")

  if (Array.isArray(product.screenshots)) {
    product.screenshots.forEach((shot, index) => {
      if (shot && typeof shot === "object") {
        add((shot as { url?: string }).url, `screenshots[${index}].url`)
      }
    })
  }

  return references
}

type AssetCheckResult = {
  ok: boolean
  status?: number
  reason?: string
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function isAcceptableContentType(contentType: string | null): boolean {
  if (!contentType) {
    return true
  }
  const normalized = contentType.toLowerCase()
  return (
    normalized.startsWith("image/") ||
    normalized.startsWith("video/") ||
    normalized === "application/octet-stream"
  )
}

async function checkAssetReference(reference: AssetReference): Promise<AssetCheckResult> {
  const attempt = async (method: "HEAD" | "GET"): Promise<AssetCheckResult> => {
    try {
      const response = await fetchWithTimeout(reference.url, { method, redirect: "follow" }, ASSET_CHECK_TIMEOUT_MS)
      if (method === "GET" && response.body) {
        void response.body.cancel().catch(() => undefined)
      }

      if (!response.ok) {
        return { ok: false, status: response.status, reason: `HTTP ${response.status}` }
      }

      if (!isAcceptableContentType(response.headers.get("content-type"))) {
        const contentType = response.headers.get("content-type")
        return {
          ok: false,
          status: response.status,
          reason: contentType ? `Unexpected content-type ${contentType}` : "Missing content-type header",
        }
      }

      return { ok: true, status: response.status }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { ok: false, reason: message }
    }
  }

  const headResult = await attempt("HEAD")
  if (headResult.ok) {
    return headResult
  }

  const getResult = await attempt("GET")
  if (getResult.ok) {
    return getResult
  }

  return {
    ok: false,
    status: getResult.status ?? headResult.status,
    reason: getResult.reason ?? headResult.reason ?? "Unknown error",
  }
}

function createStripeClients(): StripeClientConfig[] {
  const clients: StripeClientConfig[] = []
  const liveSecret = process.env.STRIPE_SECRET_KEY
  const testSecret = process.env.STRIPE_SECRET_KEY_TEST

  if (liveSecret) {
    clients.push({ stripe: new Stripe(liveSecret, { apiVersion: STRIPE_API_VERSION }) })
  }

  if (testSecret) {
    clients.push({ stripe: new Stripe(testSecret, { apiVersion: STRIPE_API_VERSION }) })
  }

  return clients
}

async function fetchStripePrice(priceId: string, clients: StripeClientConfig[]): Promise<Stripe.Price | undefined> {
  if (!clients.length) {
    return undefined
  }

  let lastError: unknown

  for (const client of clients) {
    try {
      const price = await client.stripe.prices.retrieve(priceId)
      return price
    } catch (error: unknown) {
      lastError = error
      if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "resource_missing") {
        continue
      }
      throw error
    }
  }

  if (lastError) {
    if (typeof lastError === "object" && lastError !== null && "code" in lastError && (lastError as { code?: string }).code === "resource_missing") {
      console.warn(`⚠️  Stripe price ${priceId} was not found in the configured environments.`)
      return undefined
    }
    throw lastError
  }

  return undefined
}

function parseCompareAtAmount(price: Stripe.Price): number | undefined {
  const metadata = price.metadata ?? {}
  const currency = price.currency?.toUpperCase?.()

  if (metadata.compare_at_amount_cents) {
    const parsed = Number.parseInt(metadata.compare_at_amount_cents, 10)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  if (metadata.compare_at_amount) {
    const numeric = Number.parseFloat(metadata.compare_at_amount.replace(/[^0-9.]/g, ""))
    if (Number.isFinite(numeric)) {
      const divisor = currency && ZERO_DECIMAL_CURRENCIES.has(currency) ? 1 : 100
      return Math.round(numeric * divisor)
    }
  }

  return undefined
}

function formatStripeAmount(unitAmount: number, currency: string): string {
  const normalizedCurrency = currency.toUpperCase()
  const divisor = ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency) ? 1 : 100

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: normalizedCurrency,
  }).format(unitAmount / divisor)
}

async function writePriceManifest(priceIds: Set<string>): Promise<Record<string, { unit_amount: number; currency: string; compare_at_amount?: number }>> {
  if (priceIds.size === 0) {
    return {}
  }

  const clients = createStripeClients()
  if (!clients.length) {
    console.warn("⚠️  STRIPE_SECRET_KEY or STRIPE_SECRET_KEY_TEST is not set. Skipping price manifest generation.")
    return {}
  }

  const manifestEntries: Record<string, { unit_amount: number; currency: string; compare_at_amount?: number }> = {}

  for (const priceId of priceIds) {
    if (!priceId || !priceId.startsWith("price_")) {
      continue
    }

    try {
      const price = await fetchStripePrice(priceId, clients)
      if (!price) {
        continue
      }

      if (typeof price.unit_amount !== "number" || !price.currency) {
        console.warn(`⚠️  Stripe price ${priceId} is missing unit_amount or currency; skipping.`)
        continue
      }

      const compareAt = parseCompareAtAmount(price)

      manifestEntries[priceId] = {
        unit_amount: price.unit_amount,
        currency: price.currency.toLowerCase(),
        ...(compareAt != null ? { compare_at_amount: compareAt } : {}),
      }
    } catch (error) {
      console.warn(`⚠️  Failed to retrieve Stripe price ${priceId}:`, error)
    }
  }

  if (Object.keys(manifestEntries).length === 0) {
    console.warn("⚠️  Price manifest not updated because no Stripe prices could be resolved.")
    return {}
  }

  const manifestDir = path.join(getProductsDataRoot(), "prices")
  await fs.mkdir(manifestDir, { recursive: true })

  const sortedEntries = Object.fromEntries(Object.entries(manifestEntries).sort(([a], [b]) => a.localeCompare(b)))
  await fs.writeFile(path.join(manifestDir, "manifest.json"), `${JSON.stringify(sortedEntries, null, 2)}\n`)
  return sortedEntries
}

export type ValidateProductsOptions = {
  skipPriceManifest?: boolean
  checkAssets?: boolean
}

export type ValidateProductsResult = {
  warnings: string[]
  errors: string[]
  validatedCount: number
  priceManifest: Record<string, { unit_amount: number; currency: string; compare_at_amount?: number }>
  assetFailures: ProductAssetCheckFailure[]
}

export async function validateProducts(options: ValidateProductsOptions = {}): Promise<ValidateProductsResult> {
  const { skipPriceManifest = false, checkAssets = false } = options

  const productsDir = getProductsDirectory()
  const entries = await fs.readdir(productsDir)
  const productFiles = entries.filter((file) => file.toLowerCase().endsWith(".json"))

  const errors: string[] = []
  const warnings: string[] = []
  const referencedStripePriceIds = new Set<string>()
  const assetFailures: ProductAssetCheckFailure[] = []

  const recordPriceId = (candidate?: unknown) => {
    if (typeof candidate === "string" && candidate.startsWith("price_")) {
      referencedStripePriceIds.add(candidate)
    }
  }

  const slugsFromFiles = new Set(
    productFiles.map((file) => file.replace(/\.json$/i, "")).filter((slug) => slug.trim().length > 0),
  )

  for (const slug of Array.from(slugsFromFiles).sort((a, b) => a.localeCompare(b))) {
    let resolution: ProductFileResolution
    try {
      resolution = resolveProductFilePath(slug)
    } catch (error) {
      errors.push(`❌ ${slug}: Unable to resolve product file - ${(error as Error).message}`)
      continue
    }

    const fileLabel = path.relative(process.cwd(), resolution.absolutePath)

    let raw: string
    try {
      raw = await fs.readFile(resolution.absolutePath, "utf8")
    } catch (error) {
      errors.push(`❌ ${fileLabel}: Failed to read file - ${(error as Error).message}`)
      continue
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch (error) {
      errors.push(`❌ ${fileLabel}: JSON parse error - ${(error as Error).message}`)
      continue
    }

    let product: ProductData
    try {
      product = productSchema.parse(parsed)
    } catch (error) {
      errors.push(`❌ ${fileLabel}: Schema validation failed - ${(error as Error).message}`)
      continue
    }

    if (checkAssets) {
      const assetReferences = collectAssetReferences(product)
      for (const reference of assetReferences) {
        const outcome = await checkAssetReference(reference)
        if (!outcome.ok) {
          const reason = outcome.reason ?? (outcome.status ? `HTTP ${outcome.status}` : "Unknown error")
          const message = `❌ ${fileLabel}: Asset check failed for ${reference.field} (${reference.url}) - ${reason}`
          errors.push(message)
          assetFailures.push({
            slug,
            file: fileLabel,
            field: reference.field,
            url: reference.url,
            status: outcome.status,
            reason,
          })
        }
      }
    }

    recordPriceId(product.stripe?.price_id)
    recordPriceId(product.stripe?.test_price_id)

    const activeBadges = BADGE_FLAGS.filter((flag) => {
      if (flag === "pre_release") {
        return isPreRelease(product)
      }
      return Boolean(product?.[flag])
    })

    if (activeBadges.length > 1) {
      errors.push(
        `❌ ${fileLabel}: Multiple badge flags set (${activeBadges.join(", ")}). Only one of pre_release (status), new_release, popular is allowed.`,
      )
    }

    if (product.status === "live" && product.waitlist_url) {
      warnings.push(
        `⚠️  ${fileLabel}: Product marked as live but still has a waitlist_url configured. Double-check intended state.`,
      )
    }
  }

  const priceManifest = skipPriceManifest ? {} : await writePriceManifest(referencedStripePriceIds)

  return {
    warnings,
    errors,
    validatedCount: slugsFromFiles.size,
    priceManifest,
    assetFailures,
  }
}

function parseCliOptions(args: readonly string[]): ValidateProductsOptions {
  const options: ValidateProductsOptions = {}

  for (const arg of args) {
    if (arg === "--skip-price-manifest") {
      options.skipPriceManifest = true
    } else if (arg === "--check-assets") {
      options.checkAssets = true
    }
  }

  return options
}

async function runCli() {
  try {
    const options = parseCliOptions(process.argv.slice(2))
    const result = await validateProducts(options)

    result.warnings.forEach((message) => console.warn(message))

    if (result.errors.length > 0) {
      result.errors.forEach((message) => console.error(message))
      console.error(`\nProduct validation failed with ${result.errors.length} error(s).`)
      process.exit(1)
    }

    const summary: string[] = [`✅ Validated ${result.validatedCount} product definitions.`]

    if (options.checkAssets) {
      summary.push(
        result.assetFailures.length === 0
          ? "All referenced remote assets responded successfully."
          : `${result.assetFailures.length} remote asset issue(s) detected.`,
      )
    } else {
      summary.push("No badge conflicts detected.")
    }

    console.log(summary.join(" "))
  } catch (error) {
    console.error("Unexpected error during product validation:", error)
    process.exit(1)
  }
}

const invokedDirectly =
  typeof process.argv[1] === "string"
    ? import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
    : false

if (invokedDirectly) {
  runCli()
}
