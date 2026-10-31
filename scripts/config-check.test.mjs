import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { addLiveChecks, loadEnv } from './config-check.mjs'
import { isTemplateRepo } from './is-template.mjs'

const root = join(fileURLToPath(import.meta.url), '..', '..')

/** Runs the script in a clean environment, so neither the shell nor .env.local leaks in. */
function run(args, env = {}) {
  const result = spawnSync('node', ['scripts/config-check.mjs', '--no-env-file', ...args], {
    cwd: root,
    env: { PATH: process.env.PATH, ...env },
    encoding: 'utf8',
  })
  return { out: result.stdout, err: result.stderr, status: result.status }
}

const SANITY = { NEXT_PUBLIC_SANITY_PROJECT_ID: 'abc123', NEXT_PUBLIC_SANITY_DATASET: 'production' }

describe('config:check --build', () => {
  it('fails without the project ID, in plain English', () => {
    const { err, status } = run(['--build'], { NEXT_PUBLIC_SANITY_DATASET: 'production' })
    expect(status).toBe(1)
    expect(err).toContain("This build can't go ahead")
    expect(err).toContain('NEXT_PUBLIC_SANITY_PROJECT_ID')
    expect(err).toContain('Vercel → Settings → Environment Variables')
  })

  it("passes CI's placeholder build", () => {
    const { out, status } = run(['--build'], {
      CI: 'true',
      NEXT_PUBLIC_SANITY_PROJECT_ID: 'ci-placeholder',
      NEXT_PUBLIC_SANITY_DATASET: 'production',
    })
    expect(status).toBe(0)
    expect(out).toContain('Core settings are present')
  })

  it('passes without TURNSTILE_SECRET_KEY or SANITY_API_READ_TOKEN, warning only in production', () => {
    expect(run(['--build'], SANITY).status).toBe(0)
    expect(run(['--build'], { ...SANITY, VERCEL_ENV: 'preview' }).err).toBe('')

    const production = run(['--build'], { ...SANITY, VERCEL_ENV: 'production' })
    expect(production.status).toBe(0)
    expect(production.err).toContain('SANITY_API_READ_TOKEN')
    expect(production.err).not.toContain('TURNSTILE')
  })

  it("can't be talked past the two values the build needs, even with NOCTURNE_CONFIG_GATE=warn", () => {
    const { err, status } = run(['--build'], {
      NOCTURNE_CONFIG_GATE: 'warn',
      NEXT_PUBLIC_SANITY_DATASET: 'production',
    })
    expect(status).toBe(1)
    expect(err).toContain("can't skip")
  })

  it('does not fail for a malformed FORMS_FROM_EMAIL: that was never a build requirement', () => {
    expect(run(['--build'], { ...SANITY, FORMS_FROM_EMAIL: 'not an address' }).status).toBe(0)
  })
})

/** Everything the profile switches on is set up, so `--strict` has no gap to report. */
const EVERYTHING_ON = {
  SANITY_API_READ_TOKEN: 't',
  FORMS_TEST_MODE: '1',
  STRIPE_SECRET_KEY: 'k',
  STRIPE_WEBHOOK_SECRET: 'w',
  SANITY_WRITE_TOKEN: 'e',
  AUTH_SECRET: 'a',
  AUTH_GITHUB_ID: 'i',
  AUTH_GITHUB_SECRET: 's',
  FLAGS_SECRET: 'f',
}

describe('config:check', () => {
  it('prints the table and exits 0 without --strict', () => {
    const { out, status } = run([], { ...SANITY, TURNSTILE_SECRET_KEY: 's' })
    expect(status).toBe(0)
    expect(out).toContain('Contact forms')
    expect(out).toContain('Not set up: NEXT_PUBLIC_TURNSTILE_SITE_KEY')
    expect(out).toContain("Can't check here: run with --github (task 231)")
  })

  // These two read this repository's own profile, which writes none of the service features. A client's profile switches features on and off.
  it.skipIf(!isTemplateRepo())(
    'does not call a feature that is only on by default, with nothing set, a gap',
    () => {
      const { out, status } = run(['--strict'], { ...SANITY, SANITY_API_READ_TOKEN: 't' })
      expect(out).toMatch(/· Contact forms\s+Not in use: nothing is set for it/)
      expect(out).toContain('Dormant:')
      expect(status).toBe(0)
    },
  )

  it.skipIf(!isTemplateRepo())('fails --strict for a feature that is half set up', () => {
    // This repository's profile writes none of the service features, so half set up is the case here.
    const started = run(['--strict'], {
      ...SANITY,
      SANITY_API_READ_TOKEN: 't',
      STRIPE_SECRET_KEY: 'k',
    })
    expect(started.status).toBe(1)
    expect(started.out).toContain('Not set up: STRIPE_WEBHOOK_SECRET')
  })

  it('exits 1 with --strict on a required gap, and 0 when there is none', () => {
    expect(run(['--strict'], SANITY).status).toBe(1)
    const ready = run(['--strict'], { ...SANITY, ...EVERYTHING_ON })
    expect(ready.status).toBe(0)
    expect(ready.out).toContain('✓ Contact forms')
  })

  it('fails --strict for a malformed sender, naming the feature, the problem and a fix', () => {
    const env = {
      ...SANITY,
      ...EVERYTHING_ON,
      FORMS_TEST_MODE: '',
      NEWSLETTER_PROVIDER: 'resend',
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'k',
      TURNSTILE_SECRET_KEY: 's',
      RESEND_API_KEY: 'r',
      FORMS_FROM_EMAIL: 'forms at example',
    }
    const bad = run(['--strict'], env)
    expect(bad.status).toBe(1)
    expect(bad.out).toContain('✗ Contact forms')
    expect(bad.out).toContain('FORMS_FROM_EMAIL expects an email address, or Name <address>')
    expect(bad.out).toContain('Fix: Use an address on a domain verified in Resend')
    expect(bad.out).not.toContain('forms at example')

    const good = run(['--strict'], { ...env, FORMS_FROM_EMAIL: 'Site name <forms@example.com.au>' })
    expect(good.status).toBe(0)
    expect(good.out).toContain('✓ Contact forms')
  })

  it('makes no network request without --live, and --live without a token makes none either', () => {
    // No token: checkDataset returns before fetching, so this is safe offline.
    const live = run(['--live'], SANITY)
    expect(live.status).toBe(1)
    expect(live.out).toContain('Missing in .env.local: SANITY_API_READ_TOKEN')
    expect(live.out).toContain('Live check: not implemented yet')
    expect(run([], SANITY).out).not.toContain('Live check')
  })

  it('prints stable JSON: the same keys in the same order, names and words only', () => {
    const first = JSON.parse(run(['--json'], SANITY).out)
    expect(Object.keys(first)).toEqual(['schema', 'environment', 'features', 'pending'])
    expect(Object.keys(first.features[0])).toEqual([
      'id',
      'title',
      'tier',
      'withoutIt',
      'missing',
      'unchecked',
      'invalid',
      'planned',
      'warnings',
      'status',
      'reason',
    ])
    expect(run(['--json'], SANITY).out).toBe(run(['--json'], SANITY).out)
  })

  it('prints JSON with --json', () => {
    const report = JSON.parse(run(['--json'], SANITY).out)
    expect(report.schema).toBe(1)
    const ids = report.features.map((feature) => feature.id)
    expect(ids).toEqual(expect.arrayContaining(['sanity-core', 'forms', 'newsletter', 'pricing']))
    expect(ids).toEqual(expect.arrayContaining(['backups', 'launch-check', 'config-controls']))
    expect(new Set(ids).size).toBe(ids.length)
    expect(report.pending).toEqual([])
    const states = Object.fromEntries(report.features.map((f) => [f.id, f.status]))
    expect(states['start-here']).toBe('dormant')
    expect(states['webhook-mode']).toBe('not-in-use')
  })
})

describe('loadEnv', () => {
  it('reads the environment first and .env.local second', () => {
    const dir = mkdtempSync(join(tmpdir(), 'config-check-'))
    writeFileSync(join(dir, '.env.local'), 'A=from-file\nB=from-file\n')
    const env = loadEnv(dir, { base: { A: 'from-env', C: '' } })
    expect(env).toEqual({ A: 'from-env', B: 'from-file' })
    expect(loadEnv(dir, { envFile: false, base: {} })).toEqual({})
  })
})

describe('addLiveChecks', () => {
  const report = () => ({
    features: [
      { id: 'sanity-core', status: 'ready' },
      { id: 'forms', status: 'ready' },
      { id: 'off-one', status: 'off' },
    ],
  })

  it('checks Sanity core and says the rest are not implemented yet', async () => {
    const calls = []
    const result = await addLiveChecks(report(), SANITY, {
      check: (args) => {
        calls.push(args)
        return Promise.resolve({ ok: true, message: 'Dataset "production" is private.' })
      },
    })
    expect(calls).toEqual([{ projectId: 'abc123', dataset: 'production', token: undefined }])
    expect(result.features[0].live).toEqual({
      status: 'ok',
      message: 'Dataset "production" is private.',
    })
    expect(result.features[1].live?.status).toBe('not-implemented')
    expect(result.features[2].live).toBeUndefined()
  })

  it('reports a failed check', async () => {
    const result = await addLiveChecks(report(), SANITY, {
      check: () => Promise.resolve({ ok: false, message: 'Dataset is PUBLIC.' }),
    })
    expect(result.features[0].live?.status).toBe('failed')
  })
})
