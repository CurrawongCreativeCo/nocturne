import { existsSync, readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import type { FeatureConfig } from '@/config/feature-config'
import { templateVersion } from '@/config/template-version'
import { checkRelease, type RegistrySnapshot } from '@/lib/config/changes'
import { checkHistoricalFixtures, findReadinessRegressions } from '@/lib/config/compat'

import { historicalFixtures } from './config-compat.fixtures'
import { featureRegistry } from './feature-registry'
import { readinessFunctions } from './readiness-functions'

const SNAPSHOT_FILE = 'config-registry.snapshot.json'

describe('historical fixtures', () => {
  it('are still ready: configurations that worked in 1.8.0 keep working', () => {
    expect(
      checkHistoricalFixtures(
        historicalFixtures,
        featureRegistry,
        readinessFunctions,
        templateVersion,
      ),
    ).toEqual([])
    expect(historicalFixtures.length).toBeGreaterThanOrEqual(5)
  })

  it('catch a readiness function that gets stricter while the registry is unchanged', () => {
    const strict = {
      ...readinessFunctions,
      getFormsConfig: () => ({ ready: false, missing: ['FORMS_FROM_EMAIL'] }),
    }
    expect(
      checkHistoricalFixtures(historicalFixtures, featureRegistry, strict, templateVersion).map(
        (f) => f.id,
      ),
    ).toEqual(['forms@1.8.0'])
  })

  it('catch a feature that was removed without retiring its fixture', () => {
    const without = featureRegistry.filter((feature) => feature.id !== 'forms')
    const failures = checkHistoricalFixtures(
      historicalFixtures,
      without,
      readinessFunctions,
      templateVersion,
    )
    expect(failures.map((f) => f.id)).toEqual(['forms@1.8.0'])
    expect(failures[0]?.problem).toContain('no longer registered')
  })

  it('belong to real features and carry no real-looking secret', () => {
    for (const fixture of historicalFixtures) {
      expect(
        featureRegistry.some((f) => f.id === fixture.featureId),
        fixture.id,
      ).toBe(true)
    }
    expect(JSON.stringify(historicalFixtures)).toMatch(/madeup|abc12345/)
  })
})

describe('the real registry', () => {
  it('is ready under its own fixtures, so the check is not failing on its own values', () => {
    const { checked, regressions } = findReadinessRegressions(
      featureRegistry,
      featureRegistry,
      readinessFunctions,
      templateVersion,
    )
    expect(regressions).toEqual([])
    expect(checked.length).toBeGreaterThan(5)
  })

  it('catches a real feature gaining a requirement, and accepts it behind a rename window', () => {
    const { checked } = findReadinessRegressions(
      featureRegistry,
      featureRegistry,
      readinessFunctions,
      templateVersion,
    )
    // A feature judged by its settings alone, so adding a required one is what changes its answer.
    const plain = featureRegistry.find((f) => !f.readiness && checked.includes(f.id))
    if (!plain) throw new Error('no registered feature is judged by its settings alone')
    const extra = { name: 'NEW_KEY', kind: 'server-env', where: 'vercel', required: true } as const
    const withSettings = (settings: FeatureConfig['settings']) =>
      featureRegistry.map((f) => (f.id === plain.id ? { ...f, settings } : f))

    const gained = withSettings([...plain.settings, extra])
    expect(
      findReadinessRegressions(
        featureRegistry,
        gained,
        readinessFunctions,
        templateVersion,
      ).regressions.map((r) => r.featureId),
    ).toEqual([plain.id])

    const renamed = withSettings([
      ...plain.settings,
      {
        ...extra,
        name: 'OLD_KEY',
        required: false,
        deprecated: { replacedBy: 'NEW_KEY', migration: 'Rename.', removeWhen: 'Later.' },
      },
      extra,
    ])
    expect(
      findReadinessRegressions(featureRegistry, renamed, readinessFunctions, templateVersion)
        .regressions,
    ).toEqual([])
  })

  it('is refused for nothing when compared with itself', () => {
    const own: RegistrySnapshot = { schema: 1, version: templateVersion, features: featureRegistry }
    expect(checkRelease(own, featureRegistry, '99.0.0')).toEqual([])
  })
})

// `npm run release` writes the snapshot. Until the first release that does, there is nothing to
// compare with, and the release itself treats that as the baseline.
describe.skipIf(!existsSync(SNAPSHOT_FILE))('against the last released registry', () => {
  const load = () => JSON.parse(readFileSync(SNAPSHOT_FILE, 'utf8')) as RegistrySnapshot

  it('has no change since that would be refused if it were released today', () => {
    // An early warning in `npm run check`, so a pull request doesn't wait for the release to be refused.
    const snapshot = load()
    expect(checkRelease(snapshot, featureRegistry, snapshot.version, { versions: false })).toEqual(
      [],
    )
  })

  it('is a snapshot this version of the tooling can read', () => {
    const snapshot = load()
    expect(snapshot.schema).toBe(1)
    expect(snapshot.features.length).toBeGreaterThan(0)
  })

  it('keeps every environment that was ready ready, unless a deprecation window is declared', () => {
    const snapshot = load()
    const { checked, regressions } = findReadinessRegressions(
      snapshot.features,
      featureRegistry,
      readinessFunctions,
      snapshot.version,
    )
    expect(regressions).toEqual([])
    expect(checked.length).toBeGreaterThan(0)
  })
})
