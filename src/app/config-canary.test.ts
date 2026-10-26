import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { GET } from './api/site-info/route'
import { featureRegistry, pending } from './feature-registry'

vi.mock('server-only', () => ({}))

const CANARY = 'CANARY_9f3a7c1e5b2d4a60'
const root = process.cwd()

/** Every registered secret holds the canary, as does each pending name that looks like one. */
const secretNames = [
  ...featureRegistry
    .flatMap((feature) => feature.settings)
    .filter((setting) => setting.kind === 'secret' || setting.kind === 'github-secret')
    .map((setting) => setting.name),
  ...pending
    .flatMap((entry) => entry.settings)
    .filter((name) => /(SECRET|TOKEN|API_KEY)/.test(name)),
]
const canaryEnv = Object.fromEntries(secretNames.map((name) => [name, CANARY]))

/** A clean environment for a child process: PATH and the canaries, never the developer's own. */
function runScript(args: string[], extra: Record<string, string> = {}) {
  const result = spawnSync('node', ['scripts/config-check.mjs', '--no-env-file', ...args], {
    cwd: root,
    env: { NODE_ENV: 'test', PATH: process.env.PATH ?? '', ...canaryEnv, ...extra },
    encoding: 'utf8',
  })
  return { text: `${result.stdout}\n${result.stderr}`, status: result.status }
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('the canary', () => {
  it('is set on the secrets it should be', () => {
    expect(secretNames).toEqual(
      expect.arrayContaining(['TURNSTILE_SECRET_KEY', 'SANITY_API_READ_TOKEN']),
    )
  })

  it("never appears in site-info's response", async () => {
    for (const [name, value] of Object.entries(canaryEnv)) vi.stubEnv(name, value)
    const response = GET()
    expect(await response.text()).not.toContain(CANARY)
  })

  it("never appears in getSetupStatus()'s result", async () => {
    const { getSetupStatus } = await import('./setup-status')
    const status = getSetupStatus({
      ...canaryEnv,
      NEXT_PUBLIC_SANITY_PROJECT_ID: 'abc123',
      FORMS_FROM_EMAIL: `${CANARY} is not an address`,
    })
    const text = JSON.stringify(status)
    expect(text).not.toContain(CANARY)
    expect(status.features.map((f) => f.id)).toEqual([
      'sanity-core',
      'forms',
      'health-monitoring',
      'config-controls',
    ])
  })

  it('never appears in config:check, as a table, as JSON or as the build gate message', () => {
    const outputs = [
      runScript([]),
      runScript(['--json']),
      runScript(['--strict'], { FORMS_FROM_EMAIL: CANARY, NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'k' }),
      // The failing gate and the production warning.
      runScript(['--build']),
      runScript(['--build'], {
        VERCEL_ENV: 'production',
        NEXT_PUBLIC_SANITY_PROJECT_ID: 'abc123',
        NEXT_PUBLIC_SANITY_DATASET: 'production',
        SANITY_API_READ_TOKEN: '',
      }),
    ]
    for (const output of outputs) {
      expect(output.text.length).toBeGreaterThan(20)
      expect(output.text).not.toContain(CANARY)
    }
  })
})

describe('the public site-info body', () => {
  it('has exactly the keys schema and launch', async () => {
    const body = (await GET().json()) as Record<string, unknown>
    expect(Object.keys(body).sort()).toEqual(['launch', 'schema'])
    expect(body.schema).toBe(2)
    expect(Object.keys(body.launch as object).sort()).toEqual(['homepage', 'status'])
  })
})

describe('setup-status stays private', () => {
  it('is imported by no client component and not by the public site-info route', () => {
    const files = readdirSync(join(root, 'src'), { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.(ts|tsx)$/.test(entry.name))
      .map((entry) => join(entry.parentPath, entry.name))
      .filter((file) => !file.endsWith('.test.ts') && !file.endsWith('setup-status.ts'))

    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      if (!/from ['"][^'"]*setup-status['"]/.test(source)) continue
      expect(source, file).not.toMatch(/^['"]use client['"]/m)
      expect(file, file).not.toContain(join('api', 'site-info'))
    }
  })
})
