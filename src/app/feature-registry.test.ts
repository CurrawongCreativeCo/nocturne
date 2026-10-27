import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { featureRegistry, ignored, pending } from './feature-registry'
import { readinessFunctions } from './readiness-functions'

const root = process.cwd()
const SEMVER = /^\d+\.\d+\.\d+$/

describe('the registry', () => {
  it('has one entry per feature id, with unique settings inside it', () => {
    const ids = featureRegistry.map((feature) => feature.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const feature of featureRegistry) {
      const names = feature.settings.map((setting) => setting.name)
      expect(new Set(names).size, feature.id).toBe(names.length)
    }
  })

  it('names readiness functions that exist', () => {
    for (const feature of featureRegistry) {
      if (feature.readiness)
        expect(readinessFunctions, feature.id).toHaveProperty(feature.readiness)
    }
  })

  it('writes versions as x.y.z and deprecations with a replacement', () => {
    for (const feature of featureRegistry) {
      if (feature.since) expect(feature.since, feature.id).toMatch(SEMVER)
      for (const setting of feature.settings) {
        for (const version of [setting.since, setting.enforceFrom, setting.deprecated?.removeIn]) {
          if (version) expect(version, setting.name).toMatch(SEMVER)
        }
        if (setting.deprecated) {
          // A removal needs a plan and a condition. A version only once somebody has approved one.
          expect(setting.deprecated.replacedBy, setting.name).not.toBe('')
          expect(setting.deprecated.migration, setting.name).not.toBe('')
          expect(setting.deprecated.removeWhen, setting.name).not.toBe('')
          expect(setting.required, setting.name).toBe(false)
        }
        if (setting.enforceFrom) expect(setting.requiredIn, setting.name).toBeDefined()
      }
    }
  })

  it('keeps kind and place consistent', () => {
    for (const { settings } of featureRegistry) {
      for (const setting of settings) {
        const secret = setting.kind === 'secret' || setting.kind === 'github-secret'
        // A NEXT_PUBLIC_ name is inlined into the browser bundle: never for a secret.
        if (secret) expect(setting.name, setting.name).not.toMatch(/^NEXT_PUBLIC_/)
        if (setting.kind === 'public-env')
          expect(setting.name, setting.name).toMatch(/^NEXT_PUBLIC_/)
        if (setting.kind.startsWith('github-')) expect(setting.where, setting.name).toBe('github')
      }
    }
  })

  it('gives a Settings screen what it needs: a purpose for every setting, setup steps for every feature', () => {
    for (const feature of featureRegistry) {
      expect(feature.setup?.length ?? 0, feature.id).toBeGreaterThan(0)
      expect(feature.summary, feature.id).not.toBe('')
      for (const setting of feature.settings) {
        expect(setting.purpose ?? '', `${feature.id}.${setting.name}`).not.toBe('')
        if (setting.planned) expect(setting.required, setting.name).toBe(false)
      }
    }
  })

  it('keeps the gate control out of the gate: it is not a core setting', () => {
    const owner = featureRegistry.find((feature) =>
      feature.settings.some((setting) => setting.name === 'NOCTURNE_CONFIG_GATE'),
    )
    expect(owner?.tier).toBe('optional')
    expect(owner?.id).not.toBe('sanity-core')
  })

  it('holds no value: the contract has no field for one', () => {
    const allowed = new Set([
      'name',
      'kind',
      'where',
      'targets',
      'buildTime',
      'required',
      'requiredIn',
      'requiredAtRuntime',
      'enforceFrom',
      'default',
      'format',
      'generate',
      'source',
      'since',
      'deprecated',
      'purpose',
      'managedBy',
      'planned',
      'docs',
      'envExample',
    ])
    for (const { settings } of featureRegistry) {
      for (const setting of settings) {
        for (const key of Object.keys(setting))
          expect(allowed, `${setting.name}.${key}`).toContain(key)
      }
    }
  })
})

describe('the registered features', () => {
  const byId = (id: string) => featureRegistry.find((feature) => feature.id === id)

  it('registers every feature and workflow task 233 names', () => {
    for (const id of [
      'newsletter',
      'enquiries',
      'pricing',
      'members',
      'analytics',
      'error-tracking',
      'webhook-mode',
      'indexnow',
      'redirects',
      'prelaunch',
      'style-guide',
      'experiments',
      'start-here',
      'backups',
      'enquiry-retention',
      'sanity-workflow',
      'launch-check',
    ]) {
      expect(byId(id), id).toBeDefined()
    }
  })

  it('targets the style guide token at Preview only', () => {
    const token = byId('style-guide')?.settings.find((s) => s.name === 'STYLEGUIDE_PREVIEW_TOKEN')
    expect(token?.targets).toEqual(['preview'])
  })

  it('marks Ops notices dormant, with a reason, and nothing else', () => {
    expect(byId('start-here')?.dormant).toMatch(/\S/)
    expect(featureRegistry.filter((feature) => feature.dormant).map((f) => f.id)).toEqual([
      'start-here',
    ])
  })

  it('gives every Vercel setting its environments, and no GitHub or local one', () => {
    for (const { settings } of featureRegistry) {
      for (const setting of settings) {
        if (setting.where === 'vercel')
          expect(setting.targets?.length, setting.name).toBeGreaterThan(0)
        else expect(setting.targets, setting.name).toBeUndefined()
      }
    }
  })

  it('shows no placeholder for a secret in .env.example', () => {
    for (const { settings } of featureRegistry) {
      for (const setting of settings) {
        if (!setting.envExample || !setting.envExample.placeholder) continue
        expect(['secret', 'github-secret'], setting.name).not.toContain(setting.kind)
      }
    }
  })

  it('keeps the deprecated names out of .env.example', () => {
    const deprecated = featureRegistry
      .flatMap((feature) => feature.settings)
      .filter((setting) => setting.deprecated && setting.where !== 'github')
    expect(deprecated.map((s) => s.name).sort()).toEqual([
      'NEXT_PUBLIC_SANITY_API_VERSION',
      'NEXT_PUBLIC_STUDIO_TITLE',
    ])
    for (const setting of deprecated) expect(setting.envExample, setting.name).toBe(false)
  })

  it('gives every workflow-backed feature a workflow file for config:check --github', () => {
    const source = readFileSync(join(root, 'scripts/config-check/github.mjs'), 'utf8')
    const block = /export const WORKFLOWS = \{([^}]*)\}/.exec(source)?.[1] ?? ''
    const ids = [...block.matchAll(/^\s*'?([a-z-]+)'?:/gm)].map((match) => match[1])
    for (const feature of featureRegistry) {
      const github = feature.settings.some(
        (s) => s.kind === 'github-var' || s.kind === 'github-secret',
      )
      if (github) expect(ids, feature.id).toContain(feature.id)
    }
  })
})

/** Every file whose environment reads count: the app, the scripts and the config files at the root. */
function sourceFiles(): string[] {
  const walk = (dir: string) =>
    readdirSync(join(root, dir), { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath, entry.name))
  return [
    ...walk('src'),
    ...walk('scripts'),
    ...['next.config.ts', 'sanity.config.ts', 'sanity.cli.ts', 'site.profile.ts'].map((f) =>
      join(root, f),
    ),
  ].filter(
    (file) =>
      /\.(ts|tsx|mjs|js)$/.test(file) &&
      !/\.(test|generated)\./.test(file) &&
      !file.endsWith('sanity.types.ts') &&
      !file.endsWith('feature-registry.ts'),
  )
}

// Whole names only: `process.env.NEXT_PUBLIC_${x}` is a prefix, not a setting.
const NAME = '[A-Z][A-Z0-9_]*[A-Z0-9](?![A-Za-z0-9_$])'
const READS = [
  new RegExp(`process\\.env\\.(${NAME})`, 'g'),
  new RegExp(`process\\.env\\[['"](${NAME})['"]\\]`, 'g'),
  // `env.X` where `env` is a parameter (the readiness functions take one).
  new RegExp(`\\benv\\.(${NAME})`, 'g'),
  new RegExp(`\\benv\\[['"](${NAME})['"]\\]`, 'g'),
]

function namesRead(source: string): string[] {
  const found = READS.flatMap((pattern) => [...source.matchAll(pattern)].map((m) => m[1] ?? ''))
  // const { A, B: renamed } = process.env
  for (const match of source.matchAll(/\{([^}]+)\}\s*=\s*(?:process\.)?env\b/g)) {
    for (const part of (match[1] ?? '').split(',')) {
      const name = part.split(':')[0]?.trim().split('=')[0]?.trim()
      if (name && new RegExp(`^${NAME}$`).test(name)) found.push(name)
    }
  }
  return found
}

function workflowNames(): string[] {
  const dir = join(root, '.github/workflows')
  return readdirSync(dir)
    .filter((file) => file.endsWith('.yml'))
    .flatMap((file) =>
      [
        ...readFileSync(join(dir, file), 'utf8').matchAll(
          new RegExp(`(?:vars|secrets)\\.(${NAME})`, 'g'),
        ),
      ].map((m) => m[1] ?? ''),
    )
}

const known = new Set(
  featureRegistry.flatMap((feature) => feature.settings.map((setting) => setting.name)),
)

function isIgnored(name: string) {
  return ignored.some((entry) =>
    entry.name.endsWith('*') ? name.startsWith(entry.name.slice(0, -1)) : entry.name === name,
  )
}

describe('completeness', () => {
  const fromCode = new Set(sourceFiles().flatMap((file) => namesRead(readFileSync(file, 'utf8'))))
  const fromWorkflows = new Set(workflowNames())

  it('finds the names it should, so a broken pattern cannot pass for an empty codebase', () => {
    for (const name of [
      'TURNSTILE_SECRET_KEY',
      'SANITY_API_READ_TOKEN',
      'AUTH_GITHUB_ID',
      'STRIPE_SECRET_KEY',
    ]) {
      expect(fromCode, name).toContain(name)
    }
    for (const name of ['PRODUCTION_URL', 'SANITY_AUTH_TOKEN', 'ENQUIRIES_STORE']) {
      expect(fromWorkflows, name).toContain(name)
    }
  })

  it('registers every env name read under src/ and scripts/, or lists it as ignored', () => {
    const unknown = [...fromCode].filter((name) => !known.has(name) && !isIgnored(name)).sort()
    expect(unknown, 'Add these to a config.registry.ts or to `ignored`').toEqual([])
  })

  it('does the same for every vars.X and secrets.X in the workflows', () => {
    const unknown = [...fromWorkflows].filter((name) => !known.has(name) && !isIgnored(name)).sort()
    expect(unknown).toEqual([])
  })

  it('gives each ignored name a reason, and leaves no registered name on the ignore list', () => {
    for (const entry of ignored) expect(entry.reason, entry.name).not.toBe('')
    const registered = featureRegistry.flatMap((f) => f.settings.map((s) => s.name))
    for (const name of registered) expect(isIgnored(name), name).toBe(false)
  })

  it('has nothing left on the pending list: every feature is registered', () => {
    expect(pending).toEqual([])
  })

  it('keeps a secret out of NEXT_PUBLIC_', () => {
    for (const feature of featureRegistry) {
      for (const { name } of feature.settings) {
        if (/(SECRET|TOKEN|PRIVATE)/.test(name)) expect(name, name).not.toMatch(/^NEXT_PUBLIC_/)
      }
    }
  })
})
