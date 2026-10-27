import type { FeatureConfig, FeatureSetting } from '@/config/feature-config'

import { isSet, type BuildEnvironment, type Env } from './environment'
import { suggestFormat, validateFormat } from './validators'

/** What a feature's own readiness function says (the existing `get*Config` functions). */
export interface Readiness {
  ready: boolean
  missing?: readonly string[]
}

/**
 * `not-in-use`: an opt-in feature with no switch in the profile that nothing has been set for (not
 * a gap: most sites never need it). `dormant`: nothing reads its settings yet, so no state applies.
 */
export type FeatureStatus = 'ready' | 'not-set-up' | 'off' | 'cant-check' | 'not-in-use' | 'dormant'

export interface LiveResult {
  status: 'ok' | 'failed' | 'not-implemented'
  message: string
}

/** Setting names and words only, never a value. For the agency: nothing here is public. */
export interface FeatureReport {
  id: string
  title: string
  tier: FeatureConfig['tier']
  status: FeatureStatus
  /** One line: why it is in this state. */
  reason: string
  withoutIt: string
  missing: string[]
  /** Required settings this machine can't see (GitHub). */
  unchecked: string[]
  /** Required settings whose value is the wrong shape: what is wrong, and what to change. */
  invalid: { name: string; problem: string; suggestion: string }[]
  /** Registered, but nothing reads them yet (the task that will). Not missing, not checked. */
  planned: { name: string; task: string }[]
  warnings: string[]
  live?: LiveResult
}

export interface SetupReport {
  schema: 1
  environment: BuildEnvironment
  features: FeatureReport[]
  /** Features not registered yet. Empty since task 233; kept so readers of the report don't change. */
  pending: string[]
}

export interface EvaluateInput {
  registry: readonly FeatureConfig[]
  env: Env
  environment: BuildEnvironment
  /** `siteProfile.features`: a flag set to false switches the feature off. */
  profileFeatures: Partial<Record<string, boolean>>
  /**
   * The flags `site.profile.ts` actually writes (before defaults). A feature that is only on by
   * default and has nothing set is "not in use", not a gap; one written `true` is a declaration that
   * the site uses it. Leave out to treat every flag as written.
   */
  explicitFeatures?: Partial<Record<string, boolean>>
  readiness: Record<string, (env: Env) => Readiness>
  pending?: readonly { feature: string }[]
}

/** Where this machine can look. GitHub-side settings need `--github` (task 231). */
const CHECKABLE_WHERE: readonly FeatureSetting['where'][] = ['vercel', 'local']

export function isRequired(setting: FeatureSetting, env: Env) {
  if (setting.deprecated) return false
  return typeof setting.required === 'object' ? isSet(env, setting.required.when) : setting.required
}

export function evaluateFeature(feature: FeatureConfig, input: EvaluateInput): FeatureReport {
  const { env, profileFeatures, readiness } = input
  const base = {
    id: feature.id,
    title: feature.title,
    tier: feature.tier,
    withoutIt: feature.withoutIt,
    missing: [] as string[],
    unchecked: [] as string[],
    invalid: [] as FeatureReport['invalid'],
    planned: feature.settings.flatMap((setting) =>
      setting.planned ? [{ name: setting.name, task: setting.planned }] : [],
    ),
    warnings: [] as string[],
  }

  if (feature.profileFlag && profileFeatures[feature.profileFlag] === false) {
    return { ...base, status: 'off', reason: 'Off in profile' }
  }

  if (feature.dormant) return { ...base, status: 'dormant', reason: `Dormant: ${feature.dormant}` }

  const live = feature.settings.filter((setting) => !setting.planned)
  const required = live.filter((setting) => isRequired(setting, env))
  const checkable = required.filter((setting) => CHECKABLE_WHERE.includes(setting.where))
  const unchecked = required.filter((setting) => !CHECKABLE_WHERE.includes(setting.where))

  // The feature's own function when it has one, so this agrees with what the site does.
  const readinessFn = feature.readiness ? readiness[feature.readiness] : undefined
  if (feature.readiness && !readinessFn) {
    throw new Error(`${feature.id}: readiness "${feature.readiness}" isn't a known function.`)
  }
  const missing = readinessFn
    ? [...(readinessFn(env).missing ?? [])]
    : checkable.filter((setting) => !isSet(env, setting.name)).map((setting) => setting.name)

  // A required value of the wrong shape counts as not set up: the feature can't work with it.
  const invalid = checkable.flatMap((setting) => {
    const value = env[setting.name]
    const problem = setting.format && value ? validateFormat(setting.format, value) : null
    return setting.format && problem
      ? [{ name: setting.name, problem, suggestion: suggestFormat(setting.format) }]
      : []
  })

  const warnings = live
    .filter((setting) => CHECKABLE_WHERE.includes(setting.where))
    .flatMap((setting) => {
      const value = env[setting.name]
      const lines: string[] = []
      // Optional values of the wrong shape are only a note: nothing needs them.
      const problem =
        setting.format && value && !isRequired(setting, env)
          ? validateFormat(setting.format, value)
          : null
      if (problem) lines.push(`${setting.name} doesn't look right: it ${problem}.`)
      if (setting.deprecated && value) {
        const { replacedBy, removeIn } = setting.deprecated
        lines.push(
          `${setting.name} is deprecated; replaced by ${replacedBy}. ${removeIn ? `It goes in ${removeIn}.` : 'It keeps working until a release removes it.'}`,
        )
      }
      return lines
    })

  const details = { ...base, missing, invalid, unchecked: unchecked.map((s) => s.name), warnings }
  // Nothing set for an optional feature is not a gap unless the profile declares it: opt-in
  // infrastructure and features that are merely on by default. Half set up still is a gap.
  const switches = feature.switchedBy ?? live.map((setting) => setting.name)
  const started = switches.some((name) => isSet(env, name))
  const declared = feature.profileFlag
    ? input.explicitFeatures
      ? input.explicitFeatures[feature.profileFlag] === true
      : true
    : false
  if (
    (missing.length > 0 || invalid.length > 0) &&
    feature.tier === 'optional' &&
    !started &&
    !declared
  ) {
    return {
      ...details,
      status: 'not-in-use',
      reason: feature.profileFlag
        ? `Not in use: nothing is set for it, and features.${feature.profileFlag} isn't written in site.profile.ts`
        : 'Not in use: nothing is set for it',
    }
  }
  if (missing.length > 0) {
    return { ...details, status: 'not-set-up', reason: `Not set up: ${missing.join(', ')} not set` }
  }
  if (invalid.length > 0) {
    return {
      ...details,
      status: 'not-set-up',
      reason: `Not set up: ${invalid.map((item) => `${item.name} ${item.problem}`).join('; ')}`,
    }
  }
  if (unchecked.length > 0) {
    const github = unchecked.every((setting) => setting.where === 'github')
    return {
      ...details,
      status: 'cant-check',
      reason: github
        ? "Can't check here: run with --github (task 231)"
        : "Can't check here: these settings live outside this machine",
    }
  }
  return { ...details, status: 'ready', reason: 'Ready' }
}

export function buildReport(input: EvaluateInput): SetupReport {
  return {
    schema: 1,
    environment: input.environment,
    features: input.registry.map((feature) => evaluateFeature(feature, input)),
    pending: (input.pending ?? []).map((entry) => entry.feature),
  }
}

/** True when `--strict` should fail: a feature that is on and missing something it needs. */
export function hasRequiredGap(report: SetupReport) {
  return report.features.some((feature) => feature.status === 'not-set-up')
}
