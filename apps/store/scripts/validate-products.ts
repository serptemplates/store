import { promises as fs } from "fs"
import path from "path"
import Stripe from "stripe"
import dotenv from "dotenv"
import { parse, parseDocument, type YAMLMap } from "yaml"
import { PRICING_FIELD_ORDER, PRODUCT_FIELD_ORDER, RETURN_POLICY_FIELD_ORDER, productSchema } from "../lib/products/product-schema"
import { isPreRelease } from "../lib/products/release-status"

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

  const manifestDir = path.join(process.cwd(), "data", "prices")
  await fs.mkdir(manifestDir, { recursive: true })

  const sortedEntries = Object.fromEntries(Object.entries(manifestEntries).sort(([a], [b]) => a.localeCompare(b)))
  await fs.writeFile(path.join(manifestDir, "manifest.json"), `${JSON.stringify(sortedEntries, null, 2)}\n`)
  return sortedEntries
}

function extractKeys(map: YAMLMap<unknown, unknown> | null | undefined): string[] {
  if (!map || !Array.isArray(map.items)) {
    return []
  }
  return map.items
    .map((item) => {
      if (item && typeof item === "object" && "key" in item) {
        const key = item.key as { value?: unknown }
        return typeof key?.value === "string" ? key.value : null
      }
      return null
    })
    .filter((key): key is string => Boolean(key && key.trim().length > 0))
}

function findOrderViolation(keys: string[], canonicalOrder: readonly string[]): { before: string; after: string } | null {
  const indexMap = new Map<string, number>()
  canonicalOrder.forEach((key, index) => indexMap.set(key, index))

  for (let i = 0; i < keys.length; i += 1) {
    const left = keys[i]!
    const leftIndex = indexMap.get(left)
    if (leftIndex === undefined) continue

    for (let j = i + 1; j < keys.length; j += 1) {
      const right = keys[j]!
      const rightIndex = indexMap.get(right)
      if (rightIndex === undefined) continue

      if (rightIndex < leftIndex) {
        return { before: right, after: left }
      }
    }
  }

  return null
}

async function main() {
  const productsDir = path.join(process.cwd(), "data", "products")
  const entries = await fs.readdir(productsDir)
  const yamlFiles = entries.filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"))

  const errors: string[] = []
  const warnings: string[] = []
  const productSlugs = new Set<string>()
  const referencedStripePriceIds = new Set<string>()

  const recordPriceId = (candidate?: unknown) => {
    if (typeof candidate === "string" && candidate.startsWith("price_")) {
      referencedStripePriceIds.add(candidate)
    }
  }

  for (const file of yamlFiles) {
    const fullPath = path.join(productsDir, file)
    const raw = await fs.readFile(fullPath, "utf8")

    let parsed: unknown
    const document = parseDocument(raw)
    if (document.errors.length > 0) {
      document.errors.forEach((err) => {
        errors.push(`❌ ${file}: YAML parse error - ${err.message}`)
      })
      continue
    }

    try {
      parsed = parse(raw)
    } catch (error) {
      errors.push(`❌ ${file}: YAML parse error - ${(error as Error).message}`)
      continue
    }

    let product
    try {
      product = productSchema.parse(parsed)
    } catch (error) {
      errors.push(`❌ ${file}: Schema validation failed - ${(error as Error).message}`)
      continue
    }

    productSlugs.add(product.slug)
    recordPriceId(product.stripe?.price_id)
    recordPriceId(product.stripe?.test_price_id)

    const topLevelKeys = extractKeys(document.contents as YAMLMap<unknown, unknown>)
    const orderIssue = findOrderViolation(topLevelKeys, PRODUCT_FIELD_ORDER)
    if (orderIssue) {
      errors.push(
        `❌ ${file}: Field "${orderIssue.before}" must appear before "${orderIssue.after}" to match canonical product schema order.`,
      )
      continue
    }

    const pricingNode = document.get("pricing", true) as YAMLMap<unknown, unknown> | undefined
    if (pricingNode) {
      const pricingKeys = extractKeys(pricingNode)
      const pricingIssue = findOrderViolation(pricingKeys, PRICING_FIELD_ORDER)
      if (pricingIssue) {
        errors.push(
          `❌ ${file}: pricing."${pricingIssue.before}" must appear before "${pricingIssue.after}" to match canonical order.`,
        )
        continue
      }
    }

    const returnPolicyNode = document.get("return_policy", true) as YAMLMap<unknown, unknown> | undefined
    if (returnPolicyNode) {
      const returnKeys = extractKeys(returnPolicyNode)
      const returnIssue = findOrderViolation(returnKeys, RETURN_POLICY_FIELD_ORDER)
      if (returnIssue) {
        errors.push(
          `❌ ${file}: return_policy."${returnIssue.before}" must appear before "${returnIssue.after}" to match canonical order.`,
        )
        continue
      }
    }

    const activeBadges = BADGE_FLAGS.filter((flag) => {
      if (flag === "pre_release") {
        return isPreRelease(product)
      }
      return Boolean(product?.[flag])
    })

    if (activeBadges.length > 1) {
      errors.push(
        `❌ ${file}: Multiple badge flags set (${activeBadges.join(", ")}). Only one of pre_release (status), new_release, popular is allowed.`,
      )
    }

    if (product.status === "live" && product.waitlist_url) {
      warnings.push(
        `⚠️  ${file}: Product marked as live but still has a waitlist_url configured. Double-check intended state.`,
      )
    }
  }

  warnings.forEach((message) => console.warn(message))

  await writePriceManifest(referencedStripePriceIds)

  if (errors.length > 0) {
    errors.forEach((message) => console.error(message))
    console.error(`\nProduct validation failed with ${errors.length} error(s).`)
    process.exit(1)
  }

  console.log(`✅ Validated ${yamlFiles.length} product definitions. No badge conflicts detected.`)
}

main().catch((error) => {
  console.error("Unexpected error during product validation:", error)
  process.exit(1)
})
