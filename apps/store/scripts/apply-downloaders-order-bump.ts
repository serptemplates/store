#!/usr/bin/env tsx

import fs from "node:fs"
import path from "node:path"
import { parseDocument } from "yaml"

const TARGET_SLUG_SUFFIX = "-downloader"
const TARGET_ORDER_BUMP = "serp-downloaders-bundle"

const projectRoot = path.resolve(process.cwd(), "..", "..")
const productsDir = path.join(projectRoot, "apps", "store", "data", "products")

function loadProductFiles(): string[] {
  return fs
    .readdirSync(productsDir)
    .filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"))
    .map((file) => path.join(productsDir, file))
}

function extractSlug(contents: string): string | null {
  const match = contents.match(/^slug:\s*(.+)$/m)
  return match ? match[1].trim() : null
}

function isAlreadyTarget(line: string): boolean {
  const trimmed = line.trim()
  return (
    trimmed === `order_bump: ${TARGET_ORDER_BUMP}` ||
    trimmed === `order_bump: '${TARGET_ORDER_BUMP}'` ||
    trimmed === `order_bump: "${TARGET_ORDER_BUMP}"`
  )
}

function updateOrderBumpBlock(lines: string[], index: number): boolean {
  const line = lines[index]
  const indentMatch = line.match(/^\s*/)
  const indent = indentMatch ? indentMatch[0] : ""
  const baseIndentLength = indent.length

  if (isAlreadyTarget(line)) {
    return false
  }

  let end = index + 1
  while (end < lines.length) {
    const current = lines[end]

    if (current.trim() === "") {
      break
    }

    const currentIndent = current.match(/^\s*/)?.[0].length ?? 0
    if (currentIndent <= baseIndentLength) {
      break
    }

    end += 1
  }

  lines.splice(index, end - index, `${indent}order_bump: ${TARGET_ORDER_BUMP}`)
  return true
}

function ensureOrderBumpForFile(filePath: string): boolean {
  const original = fs.readFileSync(filePath, "utf8")
  const slug = extractSlug(original)
  if (!slug || !slug.endsWith(TARGET_SLUG_SUFFIX)) {
    return false
  }

  const lines = original.split("\n")
  const orderBumpIndex = lines.findIndex((line) => line.trimStart().startsWith("order_bump:"))
  if (orderBumpIndex === -1) {
    return false
  }

  const changed = updateOrderBumpBlock(lines, orderBumpIndex)
  if (!changed) {
    return false
  }

  const updated = lines.join("\n")
  const parsed = parseDocument(updated)

  if (parsed.errors.length > 0) {
    throw new Error(
      `YAML syntax error detected after updating ${path.basename(filePath)}:\n${parsed.errors
        .map((error) => `- ${error.message}`)
        .join("\n")}`,
    )
  }

  if (updated !== original) {
    fs.writeFileSync(filePath, updated, "utf8")
  }

  console.log(`✔ Added ${TARGET_ORDER_BUMP} to ${slug}`)
  return true
}

function main() {
  const productFiles = loadProductFiles()
  let updatedCount = 0

  for (const filePath of productFiles) {
    if (ensureOrderBumpForFile(filePath)) {
      updatedCount += 1
    }
  }

  console.log(`Finished updating ${updatedCount} downloader product(s).`)
}

main()

