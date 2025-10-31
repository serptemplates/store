import { promises as fs } from "fs"
import path from "path"
import { pathToFileURL } from "url"
import Stripe from "stripe"
import dotenv from "dotenv"
import { productSchema } from "../lib/products/product-schema"
import { isPreRelease } from "../lib/products/release-status"
import {
  getProductsDataRoot,
  getProductsDirectory,
  resolveProductFilePath,
  type ProductFileResolution,
} from "../lib/products/product"

// Load env files from the package directory and fallback to the repository root.
const envFilenames = [".env.local", ".env"] as const
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
}

export type ValidateProductsResult = {
  warnings: string[]
  errors: string[]
  validatedCount: number
  priceManifest: Record<string, { unit_amount: number; currency: string; compare_at_amount?: number }>
}

export async function validateProducts(options: ValidateProductsOptions = {}): Promise<ValidateProductsResult> {
  const { skipPriceManifest = false } = options

  const productsDir = getProductsDirectory()
  const entries = await fs.readdir(productsDir)
  const productFiles = entries.filter((file) => file.toLowerCase().endsWith(".json"))

  const errors: string[] = []
  const warnings: string[] = []
  const referencedStripePriceIds = new Set<string>()

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

    let product
    try {
      product = productSchema.parse(parsed)
    } catch (error) {
      errors.push(`❌ ${fileLabel}: Schema validation failed - ${(error as Error).message}`)
      continue
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
  }
}

async function runCli() {
  try {
    const result = await validateProducts()

    result.warnings.forEach((message) => console.warn(message))

    if (result.errors.length > 0) {
      result.errors.forEach((message) => console.error(message))
      console.error(`\nProduct validation failed with ${result.errors.length} error(s).`)
      process.exit(1)
    }

    console.log(`✅ Validated ${result.validatedCount} product definitions. No badge conflicts detected.`)
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
