#!/usr/bin/env node
import { promises as fs } from 'fs'
import path from 'path'

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true'
      out[key] = val
    }
  }
  return out
}

async function readJSON(p) {
  return JSON.parse(await fs.readFile(p, 'utf8'))
}

async function writeJSON(p, obj) {
  await fs.writeFile(p, JSON.stringify(obj, null, 2) + '\n')
}

async function listSitePorts(sitesDir) {
  const entries = await fs.readdir(sitesDir, { withFileTypes: true })
  const ports = []
  for (const e of entries) {
    if (!e.isDirectory()) continue
    const pkgPath = path.join(sitesDir, e.name, 'package.json')
    try {
      const pkg = await readJSON(pkgPath)
      const dev = pkg.scripts?.dev
      const m = dev && /--port\s+(\d+)/.exec(dev)
      if (m) ports.push(Number(m[1]))
    } catch {}
  }
  return ports
}

function titleCasePlatform(p) {
  if (!p) return ''
  return p.replace(/(^|\s|[-_/])(\p{L})/gu, (m, sep, ch) => sep + ch.toUpperCase())
}

async function main() {
  const { domain, platform, repo, port } = parseArgs()
  if (!domain || !platform) {
    console.error('Usage: node scripts/create-site.mjs --domain <example.com> --platform <PlatformName> [--repo <owner/repo>] [--port <3000>]')
    process.exit(1)
  }
  const root = process.cwd()
  const srcSite = path.join(root, 'sites', 'downloadvimeo.com')
  const dstSite = path.join(root, 'sites', domain)
  const ownerRepo = repo || `serpcompany/${domain}`
  const platformName = titleCasePlatform(platform)

  // Safety checks
  try { await fs.access(srcSite) } catch { console.error('Template site not found:', srcSite); process.exit(1) }
  try { await fs.access(dstSite); console.error('Destination already exists:', dstSite); process.exit(1) } catch {}

  // Copy directory recursively
  await fs.cp(srcSite, dstSite, { recursive: true })

  // package.json
  const pkgPath = path.join(dstSite, 'package.json')
  const pkg = await readJSON(pkgPath)
  pkg.name = `@apps/${domain}`
  // choose port
  let chosenPort = Number(port)
  if (!chosenPort) {
    const used = await listSitePorts(path.join(root, 'sites'))
    const base = used.length ? Math.max(...used) + 1 : 3006
    chosenPort = base
  }
  if (pkg.scripts?.dev) {
    pkg.scripts.dev = pkg.scripts.dev.replace(/--port\s+\d+/, `--port ${chosenPort}`)
  }
  await writeJSON(pkgPath, pkg)

  // app/page.tsx: platform + exampleUrl
  const pagePath = path.join(dstSite, 'app', 'page.tsx')
  let pageSrc = await fs.readFile(pagePath, 'utf8')
  pageSrc = pageSrc.replace(/platform=\"[^\"]*\"/, `platform=\"${platformName}\"`)
  pageSrc = pageSrc.replace(/exampleUrl=\"[^\"]*\"/, `exampleUrl=\"https:\/\/example.com\/video\"`)
  await fs.writeFile(pagePath, pageSrc)

  // site.config.ts: url, name, title, email, keywords, categories, gtmId
  const cfgPath = path.join(dstSite, 'site.config.ts')
  let cfg = await fs.readFile(cfgPath, 'utf8')
  cfg = cfg
    .replace(/url:\s*\"https?:\/\/[^\"]*\"/, `url: \"https://${domain}\"`)
    .replace(/name:\s*\"[^\"]*\"/, `name: \"${platformName} Video Downloader\"`)
    .replace(/email:\s*\"[^\"]*\"/, `email: \"contact@${domain}\"`)
    .replace(/gtmId:\s*\"[^\"]*\"/, `gtmId: \"\"`)
  // simple keyword/category substitution
  cfg = cfg.replace(/categories:\s*\[[^\]]*\]/, `categories: [\n    \"${platformName} Downloaders\",\n  ]`)
  // update top-level title if present
  cfg = cfg.replace(/title:\s*\"[^\"]*\"/, `title: \"${platformName} Video Downloader - Download ${platformName} videos, audio, transcripts & more\"`)
  await fs.writeFile(cfgPath, cfg)

  // Workflow file
  const wfName = `deploy-${domain.replace(/[^a-zA-Z0-9.-]/g, '-')}.yml`
  const wfPath = path.join(root, '.github', 'workflows', wfName)
  const wf = `name: Deploy ${domain}\n\n` +
`on:\n` +
`  push:\n` +
`    branches: [ main ]\n` +
`    paths:\n` +
`      - 'sites/${domain}/**'\n` +
`      - 'packages/**'\n` +
`      - '.github/actions/deploy-site/**'\n` +
`      - 'package.json'\n` +
`      - 'pnpm-lock.yaml'\n` +
`      - 'pnpm-workspace.yaml'\n` +
`      - '.github/workflows/${wfName}'\n` +
`  workflow_dispatch: {}\n\n` +
`jobs:\n` +
`  deploy:\n` +
`    runs-on: ubuntu-latest\n` +
`    steps:\n` +
`      - name: Checkout\n` +
`        uses: actions/checkout@v4\n\n` +
`      - name: Deploy\n` +
`        uses: ./.github/actions/deploy-site\n` +
`        env:\n` +
`          GH_PAT: ` + '$' + `{{ secrets.GH_PAT }}\n` +
`        with:\n` +
`          pkg: "@apps/${domain}"\n` +
`          dir: "sites/${domain}"\n` +
`          repo: "${ownerRepo}"\n` +
`          branch: "gh-pages"\n` +
`          cname: "${domain}"\n`
  await fs.writeFile(wfPath, wf)

  console.log(`\nScaffolded site: ${domain}`)
  console.log(`  - Directory: sites/${domain}`)
  console.log(`  - Package:   @apps/${domain}`)
  console.log(`  - Dev port:  ${chosenPort}`)
  console.log(`  - Workflow:  .github/workflows/${wfName}`)
  console.log(`  - Repo:      ${ownerRepo}`)
  console.log('\nNext steps:')
  console.log(`  1) Edit sites/${domain}/site.config.ts (SEO, GTM, socials)`) 
  console.log(`  2) Update copy & blog content under sites/${domain}/content`) 
  console.log('  3) Ensure external repo exists and GH_PAT has repo:status,repo:write')
}

main().catch((e) => { console.error(e); process.exit(1) })
