import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { defineFeatureConfig } from '@/config/feature-config'
import { templateVersion } from '@/config/template-version'
import { detectBuildEnvironment } from '@/lib/config/environment'
import { ENV_TS_REQUIRED, enforcedSettings, evaluateGate, formatGate } from '@/lib/config/gate'
import { sanityCoreConfig } from '@/lib/sanity/config.registry'

import { featureRegistry } from './feature-registry'

const CORE = { NEXT_PUBLIC_SANITY_PROJECT_ID: 'abc123', NEXT_PUBLIC_SANITY_DATASET: 'production' }

function run(env: Record<string, string | undefined>) {
  return evaluateGate(featureRegistry, env, detectBuildEnvironment(env))
}

const names = (findings: { setting: { name: string } }[]) => findings.map((f) => f.setting.name)

describe('the enforced set', () => {
  it('is exactly what env.ts already throws on, so no site gains a failure mode', () => {
    expect(names(enforcedSettings(featureRegistry)).sort()).toEqual([...ENV_TS_REQUIRED].sort())
    const envTs = readFileSync('src/config/env.ts', 'utf8')
    for (const name of ENV_TS_REQUIRED) expect(envTs).toContain(`process.env.${name}`)
  })

  it('leaves out every optional feature', () => {
    const optional = featureRegistry.filter((feature) => feature.tier === 'optional')
    expect(optional.length).toBeGreaterThan(0)
    const enforced = names(enforcedSettings(featureRegistry))
    for (const setting of optional.flatMap((feature) => feature.settings)) {
      if (!ENV_TS_REQUIRED.includes(setting.name)) expect(enforced).not.toContain(setting.name)
    }
  })

  it('has no production-only setting enforced yet: each becomes required in a later release', () => {
    // When this fails because the template reached `enforceFrom`, promoting the setting is a
    // deliberate change: update the gate and the release note, don't just edit the version.
    const parts = (version: string) => version.split('.').map(Number)
    const isLater = (a: string, b: string) => {
      const [x, y] = [parts(a), parts(b)]
      const i = x.findIndex((n, index) => n !== y[index])
      return i !== -1 && (x[i] ?? 0) > (y[i] ?? 0)
    }
    for (const feature of featureRegistry) {
      for (const setting of feature.settings.filter((s) => s.requiredIn)) {
        expect(setting.enforceFrom, setting.name).toBeDefined()
        expect(isLater(setting.enforceFrom ?? '', templateVersion), setting.name).toBe(true)
      }
    }
  })
})

// PREREQUISITE for release 1.11.0 (src/lib/sanity/config.registry.ts, SANITY_API_READ_TOKEN): the gate
// does not read `enforceFrom` yet, and today it only warns, only in production. Before 1.11.0 can ship
// it must enforce the token in every environment (the site fails without it everywhere), with these
// regression tests. The test below that fails when the template reaches an `enforceFrom` forces the
// decision; these name the work.
describe('1.11.0 prerequisite: the gate enforces SANITY_API_READ_TOKEN', () => {
  it.todo('fails a Production build without the token, in plain English, naming where to set it')
  it.todo('fails a Preview build without the token')
  it.todo('accepts a CI or fake-data build, where the placeholder token is enough')
  it.todo('NOCTURNE_CONFIG_GATE=warn downgrades it to a warning, the way it does other failures')
  it.todo('still passes a site that has the token, on a public dataset as much as a private one')
})

describe('evaluateGate', () => {
  it('fails a local build without the project ID, naming it and not its neighbours', () => {
    const result = run({ NEXT_PUBLIC_SANITY_DATASET: 'production' })
    expect(names(result.failures)).toEqual(['NEXT_PUBLIC_SANITY_PROJECT_ID'])
    const text = formatGate(result).join('\n')
    expect(text).toContain('NEXT_PUBLIC_SANITY_PROJECT_ID')
    expect(text).toContain('Vercel → Settings → Environment Variables')
    expect(text).not.toContain('TURNSTILE')
  })

  it('says the live deployment stays as it is, on Vercel', () => {
    const text = formatGate(run({ VERCEL_ENV: 'production' })).join('\n')
    expect(text).toContain('never replaces the live deployment')
    expect(text).toContain('NEXT_PUBLIC_SANITY_DATASET')
  })

  it('accepts the CI placeholder environment, with no real service', () => {
    const result = run({ ...CORE, CI: 'true', NEXT_PUBLIC_SANITY_PROJECT_ID: 'ci-placeholder' })
    expect(result.failures).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it('never lets forms settings affect a build', () => {
    for (const env of [{}, { VERCEL_ENV: 'production' }, { VERCEL_ENV: 'preview' }, { CI: '1' }]) {
      const result = run({ ...CORE, ...env })
      expect(names([...result.failures, ...result.warnings])).not.toContain('TURNSTILE_SECRET_KEY')
    }
  })

  it('only warns about the read token, and only in production', () => {
    for (const env of [{}, { CI: '1' }, { VERCEL_ENV: 'preview' }]) {
      expect(run({ ...CORE, ...env }).warnings).toEqual([])
    }
    const production = run({ ...CORE, VERCEL_ENV: 'production' })
    expect(production.failures).toEqual([])
    expect(names(production.warnings)).toEqual(['SANITY_API_READ_TOKEN'])
    const text = formatGate(production).join('\n')
    // The site already fails without it; the version only says when the build starts to refuse.
    expect(text).toContain('already fails at run time without it, in every environment')
    expect(text).toContain('refuse a missing one from template version 1.11.0')
    expect(text).toContain('the site will fail without it')
    expect(text).not.toContain('will need')
    expect(run({ ...CORE, VERCEL_ENV: 'production', SANITY_API_READ_TOKEN: 'x' }).warnings).toEqual(
      [],
    )
  })

  it('cannot skip a value env.ts throws on, and says so', () => {
    const result = run({ NOCTURNE_CONFIG_GATE: 'warn', NEXT_PUBLIC_SANITY_DATASET: 'production' })
    expect(names(result.failures)).toEqual(['NEXT_PUBLIC_SANITY_PROJECT_ID'])
    expect(result.overrideRefused).toBe(true)
    expect(formatGate(result).join('\n')).toContain("can't skip the settings above")
  })

  it('turns other enforced failures into loud warnings, never the env.ts ones', () => {
    const optionalCore = defineFeatureConfig({
      ...sanityCoreConfig,
      settings: [
        ...sanityCoreConfig.settings,
        { name: 'FUTURE_CORE', kind: 'server-env', where: 'vercel', required: true, purpose: 'x' },
      ],
    })
    const env = { ...CORE, NOCTURNE_CONFIG_GATE: 'warn' }
    const result = evaluateGate([optionalCore], env, detectBuildEnvironment(env))
    expect(result.failures).toEqual([])
    expect(names(result.warnings)).toEqual(['FUTURE_CORE'])
    expect(result.overridden).toBe(true)
    expect(formatGate(result).join('\n')).toContain('NOCTURNE_CONFIG_GATE=warn is set')

    const refused = evaluateGate(
      [optionalCore],
      { NOCTURNE_CONFIG_GATE: 'warn' },
      detectBuildEnvironment({}),
    )
    expect(names(refused.failures).sort()).toEqual([...ENV_TS_REQUIRED].sort())
    expect(names(refused.warnings)).toEqual(['FUTURE_CORE'])
  })

  it('does not depend on the version: a bump alone never enforces anything', () => {
    // evaluateGate takes no version. The read token stays a warning whatever the template version is.
    expect(names(run({ ...CORE, VERCEL_ENV: 'production' }).failures)).toEqual([])
  })

  it('never lets the gate control be enforced, since it is optional', () => {
    expect(names(enforcedSettings(featureRegistry))).not.toContain('NOCTURNE_CONFIG_GATE')
  })

  it('ignores any other value of the override', () => {
    expect(run({ NOCTURNE_CONFIG_GATE: 'off' }).failures).not.toEqual([])
  })
})
