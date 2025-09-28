import { promises as fs } from "fs"
import path from "path"
import { parse } from "yaml"
import { productSchema } from "../lib/product-schema"

const BADGE_FLAGS: Array<"coming_soon" | "new_release" | "popular"> = [
  "coming_soon",
  "new_release",
  "popular",
]

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

    const activeBadges = BADGE_FLAGS.filter((flag) => Boolean(product?.[flag]))

    if (activeBadges.length > 1) {
      errors.push(
        `❌ ${file}: Multiple badge flags set (${activeBadges.join(", ")}). Only one of coming_soon, new_release, popular is allowed.`,
      )
    }

    if (product.status === "live" && product.coming_soon) {
      warnings.push(
        `⚠️  ${file}: Product marked as live and coming_soon simultaneously. Double-check intended state.`,
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
