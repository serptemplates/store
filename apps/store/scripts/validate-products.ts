import { promises as fs } from "fs"
import path from "path"
import { parse, parseDocument, type YAMLMap } from "yaml"
import { ORDER_BUMP_FIELD_ORDER, PRICING_FIELD_ORDER, PRODUCT_FIELD_ORDER, RETURN_POLICY_FIELD_ORDER, productSchema } from "../lib/products/product-schema"
import { isPreRelease } from "../lib/products/release-status"

const BADGE_FLAGS: Array<"pre_release" | "new_release" | "popular"> = [
  "pre_release",
  "new_release",
  "popular",
]

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

    const orderBumpNode = document.get("order_bump", true) as YAMLMap<unknown, unknown> | undefined
    if (orderBumpNode) {
      const orderBumpKeys = extractKeys(orderBumpNode)
      const orderBumpIssue = findOrderViolation(orderBumpKeys, ORDER_BUMP_FIELD_ORDER)
      if (orderBumpIssue) {
        errors.push(
          `❌ ${file}: order_bump."${orderBumpIssue.before}" must appear before "${orderBumpIssue.after}" to match canonical order.`,
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
