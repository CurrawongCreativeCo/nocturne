/**
 * Audits one page of a deployed site and says what is wrong with it, with the evidence:
 * `npm run audit:page -- <url> [--json] [--sample=N]` (README, "Page audit"). It fetches the page,
 * reads its metadata, headings, links, images and JSON-LD, compares it with the home page and the
 * sitemap pages it samples, and, with the read token, attaches the published document and the
 * Studio field that fixes each finding. The rules are pure functions in src/lib/audit/; the
 * fetching is scripts/audit-page/run.mjs.
 *
 * Prints findings grouped by severity. `--json` also writes audit.json to the current folder. Exits 1
 * only when there is a blocker (a page search engines cannot index), 2 on a usage error. Read only:
 * it sends GET and HEAD requests, and its Sanity client cannot write. Reads .env.local (and the
 * environment) for the Sanity values; nothing is ever printed from it.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createJiti } from 'jiti'

import { MAX_SAMPLE, pageTarget, parseArgs } from './audit-page/args.mjs'
import { confirmBlockers } from './audit-page/confirm.mjs'
import { auditJson, formatFindings } from './audit-page/format.mjs'
import { AuditRefusal } from './audit-page/guard.mjs'
import { clientFromEnv } from './audit-page/sanity.mjs'
import { parseEnv } from './check-dataset.mjs'
import { makeNet } from './launch-check.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const HELP = `Usage: npm run audit:page -- <url> [--json] [--sample=N] [--confirm] [--expect-origin=URL] [--bypass]

Audits one page: indexability, title and description, headings, JSON-LD, internal links, image alt
text and AI-search readiness. Every finding says what was seen, why it matters, and how to fix it.
--json         also write the findings to audit.json in the current folder.
--sample=N     also audit the home page and N pages from the sitemap (0 to ${MAX_SAMPLE}), and compare
               titles and descriptions across them. Without it only <url> is audited.
--confirm      audit each page that has a blocker a second time; only a blocker seen twice counts for the
               exit code (the daily health run uses this).
--expect-origin=URL  the production domain the pages declare (canonical, JSON-LD), when you audit a preview
               deployment or a local server instead of the live site. It is only compared with; the audit
               never requests anything from it.
--bypass       send x-vercel-protection-bypass (VERCEL_AUTOMATION_BYPASS_SECRET) to the site's own host.
Set NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_API_READ_TOKEN to attach the page's document and field.
Only <url>'s own origin is ever requested: a redirect, link or sitemap entry that names another host is
not followed. Exit code 1 means a blocker; 2 means the audit could not run; errors and warnings never fail it.`

/** Only the values the audit reads; .env.local first, the environment on top. */
function loadEnv() {
  const path = join(root, '.env.local')
  const file = existsSync(path) ? parseEnv(readFileSync(path, 'utf8')) : {}
  const env = {}
  for (const key of [
    'NEXT_PUBLIC_SANITY_PROJECT_ID',
    'NEXT_PUBLIC_SANITY_DATASET',
    'SANITY_API_READ_TOKEN',
    'SANITY_API_HOST',
    'VERCEL_AUTOMATION_BYPASS_SECRET',
  ]) {
    env[key] = process.env[key] || file[key] || ''
  }
  return env
}

async function main() {
  let options
  let target
  try {
    options = parseArgs(process.argv.slice(2))
    if (!options.help) target = pageTarget(options.url)
  } catch (error) {
    console.error(`${error instanceof Error ? error.message : String(error)}\n\n${HELP}`)
    process.exit(2)
  }
  if (options.help) {
    console.log(HELP)
    return
  }
  const env = loadEnv()
  if (options.bypass && !env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    console.error(
      '--bypass needs VERCEL_AUTOMATION_BYPASS_SECRET in the environment or .env.local.',
    )
    process.exit(2)
  }
  const net = makeNet(
    new URL(target).origin,
    options.bypass ? env.VERCEL_AUTOMATION_BYPASS_SECRET : undefined,
  )
  const { client, reason } = clientFromEnv(env)
  // Imported here so `--help` and usage errors are instant.
  const { runPageAudit } = await import('./audit-page/run.mjs')
  const jiti = createJiti(import.meta.url, {
    alias: { '@': join(root, 'src') },
    interopDefault: true,
  })
  const { RULES } = await jiti.import(join(root, 'src/lib/audit/finding.ts'))

  const audit = (url, sample) =>
    runPageAudit({
      target: url,
      sample,
      expectOrigin: options.expectOrigin,
      net,
      sanity: client,
      skippedContent: reason,
      log: (message) => console.error(`… ${message}`),
    })

  let outcome
  try {
    outcome = await audit(target, options.sample)
  } catch (error) {
    // 2 is "could not audit", never 1: a blocker is the only thing that exits 1.
    const message = error instanceof Error ? error.message : String(error)
    console.error(error instanceof AuditRefusal ? message : `The audit stopped: ${message}`)
    process.exit(2)
  }
  const { report, notes, pages, network } = outcome
  let blockers
  if (options.confirm) {
    blockers = await confirmBlockers({
      report,
      rerun: async (url) => (await audit(url, 0)).report,
    })
    const confirmed = blockers.filter((blocker) => blocker.confirmed).length
    if (blockers.length > 0) {
      notes.push(`${confirmed} of ${blockers.length} blocker(s) confirmed by a second look.`)
    }
  }
  const colour = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR
  console.log(`\n${formatFindings(report, { rules: RULES, pages, notes, colour })}`)
  const json = auditJson(report, {
    pages,
    notes,
    sample: options.sample,
    rules: RULES,
    confirm: options.confirm,
    blockers,
    network,
  })
  if (options.json) {
    const file = resolve(process.cwd(), 'audit.json')
    writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`)
    console.log(`\nWrote ${file}`)
  }
  if (json.blocked) process.exitCode = 1
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
