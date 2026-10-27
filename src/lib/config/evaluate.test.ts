import { describe, expect, it } from 'vitest'

import { defineFeatureConfig } from '@/config/feature-config'

import { detectBuildEnvironment } from './environment'
import { buildReport, evaluateFeature, hasRequiredGap, type EvaluateInput } from './evaluate'
import { formatTable } from './format'

const feature = defineFeatureConfig({
  id: 'demo',
  title: 'Demo',
  summary: 'A demo.',
  why: 'Testing.',
  withoutIt: 'Nothing happens.',
  profileFlag: 'forms',
  tier: 'optional',
  since: '1.0.0',
  docs: 'README.md',
  settings: [
    { name: 'DEMO_KEY', kind: 'secret', where: 'vercel', required: true },
    { name: 'DEMO_URL', kind: 'server-env', where: 'vercel', required: true, format: 'https-url' },
    { name: 'DEMO_EXTRA', kind: 'server-env', where: 'vercel', required: { when: 'DEMO_MODE' } },
    { name: 'DEMO_MODE', kind: 'server-env', where: 'vercel', required: false },
    {
      name: 'DEMO_OLD',
      kind: 'server-env',
      where: 'vercel',
      required: false,
      deprecated: {
        replacedBy: 'DEMO_URL',
        migration: 'Move it.',
        removeWhen: 'Someone approves.',
      },
      purpose: 'Old.',
    },
  ],
  verify: [],
})

const gh = defineFeatureConfig({
  ...feature,
  id: 'gh',
  title: 'GitHub thing',
  profileFlag: null,
  settings: [{ name: 'GH_VAR', kind: 'github-var', where: 'github', required: true }],
})

function input(env: Record<string, string>, extra: Partial<EvaluateInput> = {}): EvaluateInput {
  return {
    registry: [feature],
    env,
    environment: detectBuildEnvironment(env),
    profileFeatures: { forms: true },
    readiness: {},
    ...extra,
  }
}

describe('dormant and not-in-use features', () => {
  const optIn = defineFeatureConfig({ ...feature, id: 'opt-in', profileFlag: null })

  it('reports a dormant feature as dormant, whatever the environment holds', () => {
    const dormant = defineFeatureConfig({ ...optIn, dormant: 'No endpoint exists yet.' })
    const environments: Record<string, string>[] = [
      {},
      { DEMO_KEY: 'k', DEMO_URL: 'https://a.test' },
    ]
    for (const env of environments) {
      expect(evaluateFeature(dormant, input(env))).toMatchObject({
        status: 'dormant',
        reason: 'Dormant: No endpoint exists yet.',
      })
    }
  })

  it('does not count an opt-in feature nobody has started as a gap', () => {
    const report = evaluateFeature(optIn, input({}))
    expect(report).toMatchObject({
      status: 'not-in-use',
      reason: 'Not in use: nothing is set for it',
    })
    expect(hasRequiredGap(buildReport(input({}, { registry: [optIn] })))).toBe(false)
  })

  it("uses switchedBy, so another feature's setting doesn't make it look started", () => {
    const shared = defineFeatureConfig({ ...optIn, switchedBy: ['DEMO_URL'] })
    expect(evaluateFeature(shared, input({ DEMO_KEY: 'k' })).status).toBe('not-in-use')
    expect(evaluateFeature(shared, input({ DEMO_URL: 'https://a.test' })).status).toBe('not-set-up')
  })

  it('still flags an opt-in feature that is half set up', () => {
    const report = evaluateFeature(optIn, input({ DEMO_KEY: 'k' }))
    expect(report.status).toBe('not-set-up')
    expect(report.missing).toEqual(['DEMO_URL'])
  })

  it('treats a feature that is only on by default, with nothing set, as not in use', () => {
    const report = evaluateFeature(feature, input({}, { explicitFeatures: {} }))
    expect(report.status).toBe('not-in-use')
    expect(report.reason).toContain('features.forms')
    expect(hasRequiredGap(buildReport(input({}, { explicitFeatures: {} })))).toBe(false)
  })

  it('still flags a feature the profile declares, or one that is half set up', () => {
    expect(evaluateFeature(feature, input({})).status).toBe('not-set-up')
    expect(evaluateFeature(feature, input({}, { explicitFeatures: { forms: true } })).status).toBe(
      'not-set-up',
    )
    expect(
      evaluateFeature(feature, input({ DEMO_KEY: 'k' }, { explicitFeatures: {} })).status,
    ).toBe('not-set-up')
  })

  it('is never ready just because one variable exists: a readiness function can refuse', () => {
    const withReadiness = defineFeatureConfig({ ...feature, readiness: 'demo' })
    const report = evaluateFeature(
      withReadiness,
      input(
        { DEMO_KEY: 'k', DEMO_URL: 'https://a.test' },
        { readiness: { demo: () => ({ ready: false, missing: ['DEMO_OTHER'] }) } },
      ),
    )
    expect(report.status).toBe('not-set-up')
    expect(report.missing).toEqual(['DEMO_OTHER'])
  })
})

describe('evaluateFeature', () => {
  it('is ready when every required setting is set', () => {
    const report = evaluateFeature(feature, input({ DEMO_KEY: 'k', DEMO_URL: 'https://a.test' }))
    expect(report).toMatchObject({ status: 'ready', reason: 'Ready', missing: [] })
  })

  it('names what is missing', () => {
    const report = evaluateFeature(feature, input({ DEMO_KEY: 'k' }))
    expect(report.status).toBe('not-set-up')
    expect(report.missing).toEqual(['DEMO_URL'])
    expect(report.reason).toContain('DEMO_URL')
  })

  it('treats an empty value as unset', () => {
    expect(
      evaluateFeature(feature, input({ DEMO_KEY: '', DEMO_URL: 'https://a.test' })).missing,
    ).toEqual(['DEMO_KEY'])
  })

  it('requires a conditional setting only while its condition is set', () => {
    const base = { DEMO_KEY: 'k', DEMO_URL: 'https://a.test' }
    expect(evaluateFeature(feature, input(base)).status).toBe('ready')
    const report = evaluateFeature(feature, input({ ...base, DEMO_MODE: 'x' }))
    expect(report.missing).toEqual(['DEMO_EXTRA'])
  })

  it('is off when the profile switches the feature off', () => {
    const report = evaluateFeature(feature, input({}, { profileFeatures: { forms: false } }))
    expect(report).toMatchObject({ status: 'off', reason: 'Off in profile' })
    expect(hasRequiredGap(buildReport(input({}, { profileFeatures: { forms: false } })))).toBe(
      false,
    )
  })

  it("can't check GitHub-side settings", () => {
    const report = evaluateFeature(gh, input({}))
    expect(report.status).toBe('cant-check')
    expect(report.reason).toBe("Can't check here: run with --github (task 231)")
    expect(report.unchecked).toEqual(['GH_VAR'])
  })

  it("asks the feature's own readiness function instead of re-reading the env", () => {
    const withFn = defineFeatureConfig({ ...feature, readiness: 'fn' })
    const readiness = { fn: () => ({ ready: false, missing: ['FROM_FN'] }) }
    expect(evaluateFeature(withFn, input({ DEMO_KEY: 'k' }, { readiness })).missing).toEqual([
      'FROM_FN',
    ])
    expect(() => evaluateFeature(withFn, input({}))).toThrow(/isn't a known function/)
  })

  it('is not set up when a required value is the wrong shape, saying what to change', () => {
    const report = evaluateFeature(feature, input({ DEMO_KEY: 'k', DEMO_URL: 'CANARY_not_a_url' }))
    expect(report.status).toBe('not-set-up')
    expect(report.reason).toContain('DEMO_URL')
    expect(report.invalid.map((item) => item.name)).toEqual(['DEMO_URL'])
    expect(report.invalid[0]?.suggestion).toContain('https://')
    expect(JSON.stringify(report)).not.toContain('CANARY')
    expect(formatTable(buildReport(input({ DEMO_KEY: 'k', DEMO_URL: 'CANARY_x' })))).toContain(
      'Fix:',
    )
  })

  it('does not let a bad value in a switched-off feature, or in another feature, matter', () => {
    const off = evaluateFeature(
      feature,
      input({ DEMO_URL: 'nope' }, { profileFeatures: { forms: false } }),
    )
    expect(off.status).toBe('off')
    const other = buildReport(input({ DEMO_URL: 'nope' }, { registry: [feature, gh] }))
    expect(other.features.find((f) => f.id === 'gh')?.status).toBe('cant-check')
  })

  it('notes a deprecated setting without failing, and a bad optional value too', () => {
    const report = evaluateFeature(
      feature,
      input({ DEMO_KEY: 'k', DEMO_URL: 'https://a.test', DEMO_OLD: 'CANARY_old' }),
    )
    expect(report.status).toBe('ready')
    expect(report.warnings).toEqual([expect.stringContaining('DEMO_OLD is deprecated')])
    expect(report.warnings[0]).not.toContain('goes in')
    expect(JSON.stringify(report)).not.toContain('CANARY')
  })

  it('reports a planned setting as not yet implemented, never as missing', () => {
    const planned = defineFeatureConfig({
      ...gh,
      profileFlag: null,
      settings: [
        {
          name: 'GH_VAR',
          kind: 'github-var',
          where: 'github',
          required: false,
          planned: 'task 230',
        },
      ],
    })
    const report = evaluateFeature(planned, input({}))
    expect(report.status).toBe('ready')
    expect(report.missing).toEqual([])
    expect(report.planned).toEqual([{ name: 'GH_VAR', task: 'task 230' }])
    expect(formatTable(buildReport(input({}, { registry: [planned] })))).toContain(
      'not implemented yet (task 230)',
    )
  })
})

describe('the report', () => {
  it('fails --strict on a gap and lists pending features', () => {
    const report = buildReport(input({}, { pending: [{ feature: 'later' }] }))
    expect(hasRequiredGap(report)).toBe(true)
    expect(report.pending).toEqual(['later'])
    const table = formatTable(report)
    expect(table).toContain('Not set up: DEMO_KEY, DEMO_URL not set')
    expect(table).toContain('Without it: Nothing happens.')
    expect(table).toContain('Not registered yet: later.')
  })
})

describe('detectBuildEnvironment', () => {
  const kind = (env: Record<string, string>) => detectBuildEnvironment(env).kind

  it('tells the five situations apart', () => {
    expect(kind({})).toBe('local')
    expect(kind({ CI: 'true' })).toBe('ci')
    expect(kind({ SANITY_API_HOST: 'http://localhost:9999' })).toBe('ci')
    expect(kind({ NEXT_PUBLIC_SANITY_PROJECT_ID: 'ci-placeholder' })).toBe('ci')
    expect(kind({ NEXT_PUBLIC_SANITY_PROJECT_ID: 'e2etest1' })).toBe('ci')
    expect(kind({ NEXT_PUBLIC_SANITY_PROJECT_ID: 'abc123' })).toBe('local')
    expect(kind({ VERCEL_ENV: 'preview' })).toBe('preview')
    expect(kind({ VERCEL_ENV: 'production' })).toBe('production')
  })

  it("lets Vercel's own variable win over CI, which Vercel also sets", () => {
    expect(kind({ CI: '1', VERCEL_ENV: 'production' })).toBe('production')
    expect(kind({ CI: '1', VERCEL_ENV: 'preview' })).toBe('preview')
  })
})
