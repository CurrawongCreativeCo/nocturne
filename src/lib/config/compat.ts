import type { FeatureConfig, FeatureSetting } from '@/config/feature-config'

import { compareVersions, hasDeprecationWindow } from './changes'
import type { Env } from './environment'
import { evaluateFeature, isRequired, type Readiness } from './evaluate'

/**
 * Readiness compatibility (docs/nocturne/NOCTURNE_SETTINGS_CONFIGURATION.md, §R.3 safeguard 4): an
 * environment that was ready under the previous release's registry must still be ready under this
 * one, unless a deprecation window is declared. It stops an update quietly switching off a working
 * form because the feature gained a requirement. Environments are built from the registry, never
 * from a real value.
 */

/** A harmless value of the right shape for a setting; never a real secret. */
export function fixtureValue(setting: FeatureSetting) {
  switch (setting.format) {
    case 'sanity-project-id':
      return 'abc123xy'
    case 'sanity-dataset':
      return 'production'
    case 'https-url':
      return 'https://example.com.au'
    case 'email-with-name':
      return 'Example <forms@example.com.au>'
    case 'off-switch':
      return 'off'
    default:
      return 'fixture-value-0123456789abcdef0123456789abcdef'
  }
}

/** The smallest environment that satisfies a feature: every setting it requires, and what those switch on. */
export function minimalEnv(feature: FeatureConfig): Env {
  const env: Env = {}
  const settings = feature.settings.filter((setting) => !setting.planned && !setting.deprecated)
  // Conditional requirements only apply once the setting they wait for is set, so go until stable.
  for (let changed = true; changed;) {
    changed = false
    for (const setting of settings) {
      if (!env[setting.name] && isRequired(setting, env)) {
        env[setting.name] = fixtureValue(setting)
        changed = true
      }
    }
  }
  return env
}

export interface ReadinessRegression {
  featureId: string
  title: string
  /** The settings that are now missing or malformed, by name. */
  names: string[]
}

type ReadinessFunctions = Record<string, (env: Env) => Readiness>

/**
 * A missing setting that isn't a regression yet: a rename window (`deprecated.replacedBy`), or a core
 * setting whose `enforceFrom` is later than `version`, so the build only warns about it.
 */
function isAllowedGap(feature: FeatureConfig, name: string, version: string) {
  if (hasDeprecationWindow(feature, name)) return true
  const enforceFrom = feature.settings.find((setting) => setting.name === name)?.enforceFrom
  return enforceFrom !== undefined && compareVersions(enforceFrom, version) > 0
}

/**
 * Features that were ready under `previous` and are not ready under `current`. Readiness is each
 * feature's own judgement, as the site makes it: its readiness function when it has one, otherwise
 * its required settings. Functions are code, so both registries are judged by the current ones; this
 * catches a feature gaining a requirement, and leaves a fixture the functions never accepted
 * unchecked (`checked` says how many were proved, so a test can refuse an empty result). A setting
 * the current registry replaces through a deprecation window, or only warns about until a later
 * `version`, doesn't count.
 */
export function findReadinessRegressions(
  previous: readonly FeatureConfig[],
  current: readonly FeatureConfig[],
  readiness: ReadinessFunctions,
  version: string,
): { checked: string[]; regressions: ReadinessRegression[] } {
  const checked: string[] = []
  const regressions: ReadinessRegression[] = []
  const input = { profileFeatures: {}, environment: { kind: 'ci', label: 'fixture' } } as const

  for (const earlier of previous) {
    const env = minimalEnv(earlier)
    const known =
      earlier.readiness && readiness[earlier.readiness]
        ? earlier
        : { ...earlier, readiness: undefined }
    const was = evaluateFeature(known, { ...input, registry: [known], env, readiness })
    if (was.status !== 'ready') continue // GitHub-side, dormant, or a value only a real one satisfies

    const now = current.find((feature) => feature.id === earlier.id)
    if (!now) continue // removed on purpose
    checked.push(now.id)
    const report = evaluateFeature(now, { ...input, registry: current, env, readiness })
    if (report.status === 'ready') continue

    const names = [...report.missing, ...report.invalid.map((item) => item.name)]
    const covered = names.length > 0 && names.every((name) => isAllowedGap(now, name, version))
    if (!covered) regressions.push({ featureId: now.id, title: now.title, names })
  }
  return { checked, regressions }
}

/**
 * A configuration written by hand when a release shipped, not built from the registry. It stays
 * valid for as long as the site could still be running that configuration: if a later release makes
 * it stop working, the release must declare a deprecation window or the fixture is retired on purpose.
 */
export interface HistoricalFixture {
  /** `<feature>@<version it was valid in>`. */
  id: string
  featureId: string
  env: Env
  note: string
}

export interface FixtureFailure {
  id: string
  /** Why it no longer counts as ready, in words. */
  problem: string
}

/**
 * Fixtures that are no longer ready under `registry` judged by `readiness`. Unlike
 * `findReadinessRegressions`, the fixtures don't come from either registry, so a readiness function
 * that gets stricter on its own fails them even when the registry is unchanged.
 */
export function checkHistoricalFixtures(
  fixtures: readonly HistoricalFixture[],
  registry: readonly FeatureConfig[],
  readiness: ReadinessFunctions,
  version: string,
): FixtureFailure[] {
  const failures: FixtureFailure[] = []
  for (const fixture of fixtures) {
    const feature = registry.find((entry) => entry.id === fixture.featureId)
    if (!feature) {
      failures.push({
        id: fixture.id,
        problem: `${fixture.featureId} is no longer registered. Retire this fixture on purpose if that is intended.`,
      })
      continue
    }
    const report = evaluateFeature(feature, {
      registry,
      env: fixture.env,
      readiness,
      profileFeatures: {},
      environment: { kind: 'ci', label: 'fixture' },
    })
    if (report.status === 'ready') continue
    const names = [...report.missing, ...report.invalid.map((item) => item.name)]
    if (names.length > 0 && names.every((name) => isAllowedGap(feature, name, version))) continue
    failures.push({ id: fixture.id, problem: report.reason })
  }
  return failures
}
