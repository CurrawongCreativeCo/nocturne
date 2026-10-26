import type { FeatureConfig, FeatureSetting } from '@/config/feature-config'

import { isSet, type BuildEnvironment, type Env } from './environment'

/**
 * The core build gate (docs/nocturne/NOCTURNE_SETTINGS_CONFIGURATION.md, §R.3). Its job is to add no
 * new way for a working site to fail: the enforced set is what `src/config/env.ts` already throws
 * on, and the gate only turns that stack trace into plain English. Anything else a core feature
 * wants is a warning, and an optional feature never reaches it.
 */

/** The two values `env.ts` throws on. A test keeps the enforced set equal to this list. */
export const ENV_TS_REQUIRED = ['NEXT_PUBLIC_SANITY_PROJECT_ID', 'NEXT_PUBLIC_SANITY_DATASET']

export interface GateFinding {
  feature: string
  setting: FeatureSetting
}

export interface GateResult {
  environment: BuildEnvironment
  /** Missing settings that stop the build. */
  failures: GateFinding[]
  /** Missing settings that are reported and don't. */
  warnings: GateFinding[]
  /** True when `NOCTURNE_CONFIG_GATE=warn` turned some failures into warnings. */
  overridden: boolean
  /** True when it was set but could not skip a failure, because `env.ts` needs that value. */
  overrideRefused: boolean
}

function coreSettings(registry: readonly FeatureConfig[]) {
  return registry
    .filter((feature) => feature.tier === 'core')
    .flatMap((feature) => feature.settings.map((setting) => ({ feature: feature.title, setting })))
}

/**
 * Joins the enforced set only with `tier: 'core'`, a plain `required: true` and no `requiredIn` or
 * `enforceFrom`. A setting is promoted by deliberate change (a release in which it warns, then a note).
 */
export function enforcedSettings(registry: readonly FeatureConfig[]): GateFinding[] {
  return coreSettings(registry).filter(
    ({ setting }) =>
      setting.required === true &&
      !setting.requiredIn &&
      !setting.enforceFrom &&
      !setting.deprecated,
  )
}

export function evaluateGate(
  registry: readonly FeatureConfig[],
  env: Env,
  environment: BuildEnvironment,
): GateResult {
  const failures = enforcedSettings(registry).filter(({ setting }) => !isSet(env, setting.name))

  const warnings = coreSettings(registry).filter(
    ({ setting }) =>
      !setting.deprecated &&
      setting.required === true &&
      (environment.kind === 'production' || environment.kind === 'preview') &&
      setting.requiredIn?.includes(environment.kind) === true &&
      !isSet(env, setting.name),
  )

  // Only an emergency "warn" counts; any other value leaves the gate enforcing. It can never skip a
  // value `env.ts` throws on: a build without those can't work, so the gate keeps failing for them.
  const asked = env.NOCTURNE_CONFIG_GATE === 'warn'
  const downgradable = failures.filter(({ setting }) => !ENV_TS_REQUIRED.includes(setting.name))
  const overridden = asked && downgradable.length > 0
  return {
    environment,
    failures: overridden ? failures.filter((f) => !downgradable.includes(f)) : failures,
    warnings: overridden ? [...downgradable, ...warnings] : warnings,
    overridden,
    overrideRefused: asked && downgradable.length < failures.length,
  }
}

/** Where to set a setting, in words. */
export function whereToSet(setting: FeatureSetting) {
  switch (setting.where) {
    case 'vercel':
      return 'Vercel → Settings → Environment Variables'
    case 'github':
      return 'GitHub → Settings → Secrets and variables → Actions'
    case 'sanity':
      return 'the Studio'
    case 'site.profile.ts':
      return 'site.profile.ts'
    case 'local':
      return '.env.local'
  }
}

function describe({ setting }: GateFinding) {
  const lines = [`  ${setting.name}`]
  if (setting.source) lines.push(`    Where to find it: ${setting.source}`)
  lines.push(`    Set it in: ${whereToSet(setting)}`)
  if (setting.enforceFrom)
    lines.push(`    Becomes required from template version ${setting.enforceFrom}.`)
  return lines
}

/** The build output: failures, warnings, and what they mean. Names and words only, never a value. */
export function formatGate(result: GateResult): string[] {
  const { failures, warnings, overridden, environment } = result
  const out: string[] = []

  if (failures.length > 0) {
    out.push(
      `✗ This build can't go ahead: ${failures.length === 1 ? 'a required setting is' : 'required settings are'} missing (${environment.label}).`,
      '',
      ...failures.flatMap((finding) => describe(finding)),
      '',
      environment.kind === 'preview' || environment.kind === 'production'
        ? 'On Vercel a failed build never replaces the live deployment, so the live site stays exactly as it is. Add the setting, then redeploy.'
        : 'Add the setting to .env.local (or the environment), then build again.',
    )
  }

  if (result.overrideRefused) {
    out.push(
      "NOCTURNE_CONFIG_GATE=warn is set, but it can't skip the settings above: the build itself needs them.",
    )
  }
  if (overridden) {
    out.push(
      '⚠ NOCTURNE_CONFIG_GATE=warn is set, so missing settings are warnings only. Remove it once the fix has shipped.',
      '',
    )
  }
  if (warnings.length > 0) {
    out.push(
      `⚠ ${warnings.length === 1 ? 'A setting is' : 'Settings are'} missing${overridden ? '' : ' that this site will need'}. The build goes ahead.`,
      '',
      ...warnings.flatMap((finding) => describe(finding)),
    )
  }
  return out
}
