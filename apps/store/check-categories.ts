import { promises as fs } from "fs"
import path from "path"
import stripJsonComments from "strip-json-comments"

async function main() {
  const dir = "data/products"
  const files = await fs.readdir(dir)
  const jsonFiles = files.filter(f => f.endsWith(".json"))

  let downloadersWithCategory = 0
  let downloadersByName = 0

  for (const file of jsonFiles) {
    const filePath = path.join(dir, file)
    const content = await fs.readFile(filePath, "utf8")
    const stripped = stripJsonComments(content)
    const parsed = JSON.parse(stripped)
    
    // Check if has downloader in categories
    if (Array.isArray(parsed.categories) && parsed.categories.includes("downloader")) {
      downloadersWithCategory++
    }
    
    // Check if name contains downloader (old rule)
    if (typeof parsed.name === "string" && /downloader|download|m3u8|stream.?ripper|stream.?recorder|video.?saver|audio.?saver/i.test(parsed.name)) {
      downloadersByName++
    }
  }

  console.log(`
📊 Product Categorization Analysis:

BEFORE (old rule - checked slug, name, keywords, categories):
  - Approximately ${downloadersByName} products matched via name pattern

AFTER (new rule - only checks categories field):
  - ${downloadersWithCategory} products have "downloader" in categories

This means ${downloadersByName - downloadersWithCategory} products no longer need the legal FAQ!
  `)
}

main().catch(console.error)
