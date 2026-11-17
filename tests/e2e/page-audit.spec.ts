import { execFile } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { expect, type APIRequestContext } from '@playwright/test'

import { APP_ENV, APP_PORT, FAKE_SANITY_PORT, SITE_URL } from './constants'
import { test } from './fixtures/test'

test.skip(({ isMobile }) => isMobile, 'Desktop only')

const run = promisify(execFile)
const SCRIPT = join(process.cwd(), 'scripts', 'audit-page.mjs')
const SITE = `http://localhost:${APP_PORT}`

interface Audit {
  schema: number
  blocked: boolean
  summary: Record<string, number>
  findings: {
    ruleId: string
    basis: string
    severity: string
    scope: { url?: string; documentId?: string; path?: string }
    evidence: { observed: unknown; source: string; at: string }
    why: string
    fix: { summary: string; studioIntent?: string }
    verify: string
  }[]
}

/**
 * Runs the real command against the production build the suite serves. The site declares the
 * production origin (`SITE_URL`) in its canonicals and JSON-LD, so `--expect-origin` says so. The
 * content side reads the fake Content Lake with the same token the site uses.
 */
async function audit(path: string, ...flags: string[]) {
  const dir = mkdtempSync(join(tmpdir(), 'audit-page-'))
  try {
    let code = 0
    try {
      await run(
        process.execPath,
        [SCRIPT, `${SITE}${path}`, `--expect-origin=${SITE_URL}`, '--json', ...flags],
        {
          cwd: dir,
          env: {
            ...process.env,
            NEXT_PUBLIC_SANITY_PROJECT_ID: APP_ENV.NEXT_PUBLIC_SANITY_PROJECT_ID,
            NEXT_PUBLIC_SANITY_DATASET: APP_ENV.NEXT_PUBLIC_SANITY_DATASET,
            SANITY_API_READ_TOKEN: APP_ENV.SANITY_API_READ_TOKEN,
            SANITY_API_HOST: APP_ENV.SANITY_API_HOST,
          },
        },
      )
    } catch (error) {
      // A blocker is exit code 1, which execFile reports as a rejection carrying the code.
      code = (error as { code?: number }).code ?? 1
    }
    const json = JSON.parse(readFileSync(join(dir, 'audit.json'), 'utf8')) as Audit
    return { code, json }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** What the fake Content Lake has been asked to write (the Stripe webhook syncing prices). */
async function mutations(request: APIRequestContext) {
  return (await request.get(`http://localhost:${FAKE_SANITY_PORT}/__fixture/mutations`)).text()
}

test.describe('npm run audit:page', () => {
  // Pages with a title and description of their own, so only a real problem can be found.
  for (const path of ['/', '/about']) {
    test(`finds nothing at warning or above on ${path}`, async () => {
      const { code, json } = await audit(path)
      const serious = json.findings.filter(({ severity }) => severity !== 'suggestion')
      expect(
        serious.map(({ ruleId, severity, evidence }) => ({ ruleId, severity, evidence })),
        'the clean fixture page should produce no finding at warning or above',
      ).toEqual([])
      expect(code).toBe(0)
      expect(json.schema).toBe(1)
      expect(json.blocked).toBe(false)
    })
  }

  test('gives every finding its evidence, reason, fix and way to re-check', async () => {
    // A page that does not exist is the one thing the fixtures get wrong on purpose.
    const { json } = await audit('/audit-this-page-does-not-exist')
    expect(json.findings.length).toBeGreaterThan(0)
    for (const finding of json.findings) {
      expect(finding.evidence.observed, finding.ruleId).toBeDefined()
      expect(finding.evidence.source, finding.ruleId).toBeTruthy()
      expect(Number.isNaN(Date.parse(finding.evidence.at)), finding.ruleId).toBe(false)
      expect(finding.why, finding.ruleId).toMatch(/\S/)
      expect(finding.fix.summary, finding.ruleId).toMatch(/\S/)
      expect(finding.verify, finding.ruleId).toContain('npm run audit:page')
    }
  })

  test('exits non-zero for a blocker, and only then', async () => {
    const { code, json } = await audit('/audit-this-page-does-not-exist')
    expect(json.findings.map(({ ruleId, severity }) => [ruleId, severity])).toEqual([
      ['seo.status', 'blocker'],
    ])
    expect(json.blocked).toBe(true)
    expect(code).toBe(1)
  })

  test('attaches the document and field when the fix is a field', async () => {
    // Whatever the sample finds, a finding that names a document also names the field and a Studio
    // intent of the form Content health uses.
    const { json } = await audit('/about', '--sample=10')
    const withField = json.findings.filter(({ scope }) => scope.documentId)
    for (const finding of withField) {
      expect(finding.scope.path, finding.ruleId).toBeTruthy()
      expect(finding.fix.studioIntent, finding.ruleId).toMatch(/^edit;id=[^;]+;type=[^;]+;path=/)
    }
  })

  test('never writes to the Content Lake', async ({ request }) => {
    const before = await mutations(request)
    await audit('/', '--sample=5')
    expect(await mutations(request)).toBe(before)
  })
})
