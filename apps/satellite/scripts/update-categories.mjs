import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const productsDir = path.join(__dirname, "..", "data", "products");
const downloaderCategory = "Downloader";
const aiCategory = "Artificial Intelligence";

function extractSlug(content) {
  const match = content.match(/^slug:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

function normalize(value) {
  return value.trim().toLowerCase();
}

function updateCategories(content, slug) {
  const lines = content.split("\n");
  const catIndex = lines.findIndex((line) => line.trimStart().startsWith("categories:"));

  if (catIndex === -1) {
    return { content, changed: false };
  }

  const indentMatch = lines[catIndex].match(/^\s*/);
  const indent = indentMatch ? indentMatch[0] : "";

  const inlineMatch = lines[catIndex].match(/\[(.*)\]/);
  let categories = [];
  let blockStart = catIndex + 1;
  let blockLength = 0;
  let itemIndent = `${indent}  `;

  if (inlineMatch) {
    const inlineValues = inlineMatch[1]
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    categories = inlineValues;
    lines[catIndex] = `${indent}categories:`;
  } else {
    let current = blockStart;
    let detectedIndent = null;
    while (current < lines.length) {
      const line = lines[current];
      const match = line.match(/^(\s*)-\s+/);
      if (match) {
        if (detectedIndent === null) {
          detectedIndent = match[1];
        }
        if (match[1] === detectedIndent) {
          categories.push(line.slice(match[0].length));
          current += 1;
          blockLength += 1;
          continue;
        }
      }
      if (line.trim() === "") {
        current += 1;
        blockLength += 1;
        continue;
      }
      break;
    }
    if (detectedIndent !== null) {
      itemIndent = detectedIndent;
    }
  }

  const targetCategories = new Map();
  categories.forEach((category) => {
    if (category) {
      targetCategories.set(normalize(category), category);
    }
  });

  let changed = false;

  if (slug.includes("downloader")) {
    if (!targetCategories.has(normalize(downloaderCategory))) {
      targetCategories.set(normalize(downloaderCategory), downloaderCategory);
      changed = true;
    }
  }

  if (slug === "ai-voice-cloner-app") {
    if (!targetCategories.has(normalize(aiCategory))) {
      targetCategories.set(normalize(aiCategory), aiCategory);
      changed = true;
    }
  }

  if (!changed) {
    return { content, changed: false };
  }

  const newCategories = Array.from(targetCategories.values());

  if (!inlineMatch && blockLength > 0) {
    lines.splice(blockStart, blockLength);
  }

  const blockLines = newCategories.map((category) => `${itemIndent}- ${category}`);
  lines.splice(blockStart, 0, ...blockLines);

  return { content: lines.join("\n"), changed: true };
}

const files = fs.readdirSync(productsDir).filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"));

let touched = 0;

for (const file of files) {
  const filePath = path.join(productsDir, file);
  const original = fs.readFileSync(filePath, "utf8");
  const slug = extractSlug(original);
  if (!slug) continue;

  const { content, changed } = updateCategories(original, slug);
  if (changed) {
    fs.writeFileSync(filePath, content, "utf8");
    touched += 1;
  }
}

console.log(`Updated categories in ${touched} product file(s).`);
