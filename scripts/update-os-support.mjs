#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { parseDocument } from "yaml";

const productsDir = path.resolve("apps/store/data/products");
const newOsList = ["mac", "windows", "linux", "chrome", "firefox", "edge"];

console.log("🔄 Updating supported_operating_systems in all product YAML files...\n");

const files = fs.readdirSync(productsDir).filter(f => f.endsWith('.yaml'));
console.log(`Found ${files.length} YAML files to update\n`);

let updated = 0;
let errors = 0;

for (const file of files) {
  const filePath = path.join(productsDir, file);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const doc = parseDocument(content);
    
    // Update the supported_operating_systems field
    if (doc.has('supported_operating_systems')) {
      doc.set('supported_operating_systems', newOsList);
      
      // Write back to file
      fs.writeFileSync(filePath, doc.toString());
      console.log(`✅ Updated: ${file}`);
      updated++;
    } else {
      console.log(`⚠️  No supported_operating_systems field in: ${file}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
    errors++;
  }
}

console.log(`\n✨ Complete! Updated ${updated} files, ${errors} errors`);
