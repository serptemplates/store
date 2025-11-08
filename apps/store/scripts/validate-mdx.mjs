#!/usr/bin/env node
// Simple MDX/Markdown validator and fixer for void HTML tags in MDX (img, br, hr, etc.)
// - Warns on non–self-closed void elements which break MDX compile
// - With --fix, rewrites offending tags to self-closing form

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(process.cwd());
const CONTENT_ROOT = path.join(ROOT, 'content', 'blog');
const VOID_TAGS = [
  'img', 'br', 'hr', 'input', 'meta', 'link', 'source', 'track', 'area', 'base', 'col', 'embed', 'param', 'wbr',
];

const args = new Set(process.argv.slice(2));
const SHOULD_FIX = args.has('--fix');

function listFiles(dir, acc = []) {
  const entries = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listFiles(full, acc);
    else if (/\.(md|mdx)$/i.test(entry.name)) acc.push(full);
  }
  return acc;
}

function scanAndMaybeFix(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const lines = raw.split(/\r?\n/);

  let inCodeFence = false;
  let errors = [];

  // Collect problems first, and optionally apply fixes
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    for (const tag of VOID_TAGS) {
      // Match <tag ...> that is NOT already self-closed (no /> before the >)
      const pattern = new RegExp(`<${tag}\\b([^>]*)>`, 'gi');
      let match;
      let offset = 0;
      while ((match = pattern.exec(line)) !== null) {
        const fullMatch = match[0];
        const attrs = match[1] ?? '';
        if (/\/>\s*$/.test(fullMatch)) {
          continue; // already self-closed
        }
        errors.push({ file, line: i + 1, tag, snippet: fullMatch.trim() });
        if (SHOULD_FIX) {
          const fixed = `<${tag}${attrs} />`;
          const start = match.index + offset;
          const end = start + fullMatch.length;
          lines[i] = lines[i].slice(0, start) + fixed + lines[i].slice(end);
          offset += fixed.length - fullMatch.length;
        }
      }
    }
  }

  if (SHOULD_FIX && errors.length > 0) {
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
  }

  return errors;
}

function main() {
  const files = listFiles(CONTENT_ROOT);
  if (files.length === 0) {
    console.log('[mdx-validate] No MDX/MD files found under', CONTENT_ROOT);
    return;
  }
  let allErrors = [];
  for (const file of files) {
    allErrors.push(...scanAndMaybeFix(file));
  }

  if (allErrors.length === 0) {
    console.log('[mdx-validate] No MDX void-tag issues found.');
    return;
  }

  const header = SHOULD_FIX ? '[mdx-validate] Fixed MDX void-tag issues:' : '[mdx-validate] Found MDX void-tag issues:';
  console.warn(header);
  for (const e of allErrors) {
    console.warn(`- ${e.file}:${e.line} — <${e.tag}> should be self-closed. Snippet: ${e.snippet}`);
  }
  if (!SHOULD_FIX) {
    console.warn('Run with --fix to auto-correct.');
    process.exitCode = 1;
  }
}

main();

