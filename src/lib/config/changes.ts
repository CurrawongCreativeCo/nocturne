import type { FeatureConfig, FeatureSetting } from '@/config/feature-config'

import { whereToSet } from './gate'

/**
 * What changed in the feature registry between releases (docs/nocturne/NOCTURNE_SETTINGS_CONFIGURATION.md,
 * §R.3 and §B.9). Pure functions over registry data, no file or git access, so the scripts load them
 * with jiti and the tests call them directly:
 *
 * - `changesSince` reads the composed registry's `since`, `deprecated`, `required`, `requiredIn` and
 *   `enforceFrom` and says what an owner updating from an older version has to know
 *   (`config:check --since`, the CHANGELOG's "New configuration in X.Y.Z").
 * - `checkRelease` compares the registry being released with the previous release's snapshot and
 *   refuses the changes that could quietly break a working site.
 *
 * Names and words only, never a value.
 */

/** The released registry, saved by `npm run release` as `config-registry.snapshot.json`. */
export interface RegistrySnapshot {
  schema: 1
  /** The template version it was released as. */
  version: string
  features: readonly FeatureConfig[]
}

export function parseVersion(value: string): [number, number, number] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value)
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null
}

/** Negative when a < b. Throws on anything that isn't plain MAJOR.MINOR.PATCH. */
export function compareVersions(a: string, b: string) {
  const left = parseVersion(a)
  const right = parseVersion(b)
  if (!left || !right) throw new Error(`Cannot compare "${a}" and "${b}"`)
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2]
}

const isLater = (a: string, b: string) => compareVersions(a, b) > 0

/** True when `version` is after `from` and no later than `to`. */
const inRange = (version: string | undefined, from: string, to: string) =>
  version !== undefined && isLater(version, from) && !isLater(version, to)

export interface SettingChange {
  featureId: string
  feature: string
  tier: FeatureConfig['tier']
  setting: FeatureSetting
}

export interface FeatureChange {
  feature: FeatureConfig
  /** Names of the settings it needs (required and not deprecated). */
  needs: string[]
  /** True when the environment already satisfies it, so it isn't "not set up". */
  setUp: boolean
}

export interface ConfigChanges {
  since: string
  current: string
  /** Core settings the build refuses to run without from a version in this range. Set these first. */
  enforced: SettingChange[]
  /** Core settings that warn now and are enforced from a later version. */
  upcoming: SettingChange[]
  /** New required settings on features that already existed. */
  newRequired: SettingChange[]
  /** Features introduced in the range. */
  newFeatures: FeatureChange[]
  /** New optional settings on features that already existed. */
  newSettings: SettingChange[]
  /** Deprecations announced in this range, with their replacement. */
  deprecations: SettingChange[]
  /**
   * Deprecated earlier, or with no known announcement version. Not described again as news: the
   * `config:check` table still warns when a site sets one.
   */
  stillDeprecated: SettingChange[]
}

const sinceOf = (feature: FeatureConfig, setting: FeatureSetting) => setting.since ?? feature.since

const liveSettings = (feature: FeatureConfig) =>
  feature.settings.filter((setting) => !setting.planned)

const needs = (feature: FeatureConfig) =>
  liveSettings(feature)
    .filter((setting) => setting.required === true && !setting.deprecated)
    .map((setting) => setting.name)

/**
 * What an owner updating from `since` to `current` needs to know. A feature or setting with no
 * `since` is never reported as new: its history isn't known. `readyIds` lists features the owner's
 * environment already satisfies (from `config:check`'s report); leave it out when that isn't known.
 */
export function changesSince(
  registry: readonly FeatureConfig[],
  since: string,
  current: string,
  readyIds: ReadonlySet<string> = new Set(),
): ConfigChanges {
  const changes: ConfigChanges = {
    since,
    current,
    enforced: [],
    upcoming: [],
    newRequired: [],
    newFeatures: [],
    newSettings: [],
    deprecations: [],
    stillDeprecated: [],
  }

  for (const feature of registry) {
    const featureIsNew = inRange(feature.since, since, current)
    if (featureIsNew) {
      changes.newFeatures.push({
        feature,
        needs: needs(feature),
        setUp: readyIds.has(feature.id),
      })
    }

    for (const setting of liveSettings(feature)) {
      const change: SettingChange = {
        featureId: feature.id,
        feature: feature.title,
        tier: feature.tier,
        setting,
      }
      if (setting.deprecated) {
        if (inRange(setting.deprecated.since, since, current)) changes.deprecations.push(change)
        else changes.stillDeprecated.push(change)
        continue
      }
      if (feature.tier === 'core' && setting.required === true && setting.enforceFrom) {
        if (inRange(setting.enforceFrom, since, current)) {
          changes.enforced.push(change)
          continue
        }
        if (isLater(setting.enforceFrom, current)) {
          changes.upcoming.push(change)
          continue
        }
      }
      // A new feature's settings are described with the feature.
      if (featureIsNew || !inRange(sinceOf(feature, setting), since, current)) continue
      if (setting.required === false) changes.newSettings.push(change)
      else changes.newRequired.push(change)
    }
  }
  return changes
}

export function hasChanges(changes: ConfigChanges) {
  return (
    changes.enforced.length +
      changes.upcoming.length +
      changes.newRequired.length +
      changes.newFeatures.length +
      changes.newSettings.length +
      changes.deprecations.length >
    0
  )
}

const code = (name: string, markdown: boolean) => (markdown ? `\`${name}\`` : name)

function settingLine({ setting, feature }: SettingChange, markdown: boolean) {
  const parts = [`${code(setting.name, markdown)} (${feature}): set it in ${whereToSet(setting)}`]
  if (setting.enforceFrom) parts.push(`required from ${setting.enforceFrom}`)
  if (setting.requiredIn) parts.push(`in ${setting.requiredIn.join(' and ')}`)
  if (setting.source) parts.push(`find it: ${setting.source}`)
  return parts.join('; ')
}

function featureLine({ feature, needs: names, setUp }: FeatureChange, markdown: boolean) {
  const title = markdown ? `**${feature.title}**` : feature.title
  const state = setUp
    ? 'already set up here'
    : feature.tier === 'core'
      ? 'core feature'
      : 'available, not set up'
  const needed =
    names.length > 0 ? ` Needs ${names.map((name) => code(name, markdown)).join(', ')}.` : ''
  return `${title}: ${feature.summary} (${state}).${needed}`
}

function deprecationLine({ setting }: SettingChange, markdown: boolean) {
  const { replacedBy, migration, removeIn } = setting.deprecated ?? {
    replacedBy: '',
    migration: '',
  }
  const removal = removeIn ? `removed in ${removeIn}` : 'no removal date yet'
  return `${code(setting.name, markdown)} is replaced by ${replacedBy} (${removal}). ${migration}`
}

/**
 * The lines `config:check --since` prints, plain or as Markdown for the client update PR. The
 * sections that can stop a deploy come first. Empty when nothing changed.
 */
export function formatChanges(changes: ConfigChanges, { markdown = false } = {}): string[] {
  if (!hasChanges(changes)) return []
  const out: string[] = []
  const section = (title: string, lines: string[]) => {
    if (lines.length === 0) return
    out.push(markdown ? `### ${title}` : title, '', ...lines.map((line) => `- ${line}`), '')
  }

  section(
    'Set these before merging: the build fails without them',
    changes.enforced.map((change) => settingLine(change, markdown)),
  )
  section(
    'New required settings',
    changes.newRequired.map((change) => settingLine(change, markdown)),
  )
  section(
    'Required from a later version: set them now, the build only warns',
    changes.upcoming.map((change) => settingLine(change, markdown)),
  )
  section(
    'New features',
    changes.newFeatures.map((change) => featureLine(change, markdown)),
  )
  section(
    'New optional settings',
    changes.newSettings.map(({ setting, feature }) => {
      const what = setting.purpose ? ` ${setting.purpose}` : ''
      return `${code(setting.name, markdown)} (${feature}).${what}`
    }),
  )
  section(
    'Deprecations',
    changes.deprecations.map((change) => deprecationLine(change, markdown)),
  )

  const heading = markdown ? '## Configuration changes' : 'Configuration changes'
  return [heading, '', `Updating from ${changes.since} to ${changes.current}.`, '', ...out].slice(
    0,
    -1,
  )
}

/** The body of the CHANGELOG's "New configuration in X.Y.Z" section. Empty when there is none. */
export function changelogLines(changes: ConfigChanges): string[] {
  const lines = formatChanges(changes, { markdown: true })
  // Drop the PR heading and its "Updating from" line; the CHANGELOG supplies its own heading.
  const start = lines.findIndex((line) => line.startsWith('### '))
  return start === -1
    ? []
    : lines.slice(start).map((line) => (line.startsWith('### ') ? `**${line.slice(4)}**` : line))
}

/** Compares two registries by a requirement's strength: nothing, only while another is set, always. */
const strength = (setting: FeatureSetting | undefined) =>
  !setting || setting.required === false ? 0 : typeof setting.required === 'object' ? 1 : 2

/** Whether the build gate enforces it at `version`: a core feature's plain `required: true`, from `enforceFrom` if set. */
export function isEnforcedAt(feature: FeatureConfig, setting: FeatureSetting, version: string) {
  if (feature.tier !== 'core' || setting.required !== true || setting.deprecated) return false
  return setting.enforceFrom ? !isLater(setting.enforceFrom, version) : !setting.requiredIn
}

/** A rename window: another setting in the feature is deprecated in favour of this one. */
export function hasDeprecationWindow(feature: FeatureConfig, name: string) {
  return feature.settings.some((setting) => setting.deprecated?.replacedBy === name)
}

/** Entries that claim to be from a version later than the release carrying them: their history is wrong. */
export function checkVersions(current: readonly FeatureConfig[], version: string): string[] {
  const problems: string[] = []
  const later = (value: string | undefined) => value !== undefined && isLater(value, version)
  for (const feature of current) {
    if (later(feature.since)) {
      problems.push(
        `${feature.title} says since ${feature.since}, later than this release (${version}).`,
      )
    }
    for (const setting of feature.settings) {
      if (later(setting.since) || later(setting.deprecated?.since)) {
        problems.push(
          `${setting.name} (${feature.title}) says it is from ${setting.deprecated?.since ?? setting.since}, later than this release (${version}).`,
        )
      }
    }
  }
  return problems
}

/**
 * The first release with a snapshot has nothing to compare with, so it must establish a baseline that
 * adds no requirement for existing sites: the only settings the build enforces are the ones already
 * needed to build at all (`allowedEnforced`, which the gate test keeps equal to what `env.ts` throws on).
 */
export function checkBaseline(
  current: readonly FeatureConfig[],
  version: string,
  allowedEnforced: readonly string[],
): string[] {
  return current.flatMap((feature) =>
    liveSettings(feature)
      .filter((setting) => isEnforcedAt(feature, setting, version))
      .filter((setting) => !allowedEnforced.includes(setting.name))
      .map(
        (setting) =>
          `${setting.name} (${feature.title}) is enforced at ${version}, but nothing before this release warned about it. A baseline may only enforce ${allowedEnforced.join(' and ')}.`,
      ),
  )
}

/** What the baseline contains, for the person releasing it to read: the enforced set and what warns. */
export function baselineSummary(current: readonly FeatureConfig[], version: string): string[] {
  const all = current.flatMap((feature) =>
    liveSettings(feature).map((setting) => ({ feature, setting })),
  )
  const enforced = all.filter(({ feature, setting }) => isEnforcedAt(feature, setting, version))
  const warns = all.filter(
    ({ feature, setting }) =>
      feature.tier === 'core' &&
      setting.required === true &&
      !setting.deprecated &&
      !isEnforcedAt(feature, setting, version),
  )
  return [
    `${current.length} features registered.`,
    `Enforced by the build: ${enforced.map(({ setting }) => setting.name).join(', ') || 'none'}.`,
    ...warns.map(
      ({ setting }) =>
        `Warns only: ${setting.name}${setting.enforceFrom ? `, enforced from ${setting.enforceFrom}` : ''}.`,
    ),
  ]
}

/**
 * Why `current`, released as `version`, must not ship after `previous`: the three ways a release
 * could switch off a working feature or make a site undeployable (§R.3 safeguard 2). Empty when it is
 * safe. Pass `previous: null` for the first release with a snapshot: there is nothing to compare, so
 * it is the baseline and nothing is refused.
 */
export function checkRelease(
  previous: RegistrySnapshot | null,
  current: readonly FeatureConfig[],
  version: string,
): string[] {
  const problems = checkVersions(current, version)
  if (!previous) return problems
  const before = new Map(previous.features.map((feature) => [feature.id, feature]))

  for (const feature of current) {
    const earlier = before.get(feature.id)

    // 3. A core feature added with a requirement the build would enforce at once.
    if (feature.tier === 'core' && earlier?.tier !== 'core') {
      for (const setting of liveSettings(feature)) {
        if (setting.required !== true || setting.deprecated) continue
        if (setting.enforceFrom && isLater(setting.enforceFrom, version)) continue
        problems.push(
          `${setting.name} (${feature.title}) is required by a core feature added in ${version}, with ${setting.enforceFrom ? `enforceFrom ${setting.enforceFrom}, which is not later than this release` : 'no enforceFrom'}. Give it an enforceFrom later than ${version} so it only warns first.`,
        )
      }
      continue
    }

    for (const setting of liveSettings(feature)) {
      const earlierSetting = earlier?.settings.find((s) => s.name === setting.name)

      // 1. Enforced now, without a release in which it was a warning.
      if (isEnforcedAt(feature, setting, version)) {
        const wasEnforced =
          earlier && earlierSetting && isEnforcedAt(earlier, earlierSetting, previous.version)
        const warned =
          earlierSetting &&
          earlier?.tier === 'core' &&
          earlierSetting.required === true &&
          !earlierSetting.deprecated &&
          earlierSetting.enforceFrom !== undefined &&
          isLater(earlierSetting.enforceFrom, previous.version)
        if (!wasEnforced && !warned) {
          problems.push(
            `${setting.name} (${feature.title}) becomes enforced in ${version}, but ${previous.version} did not warn about it. Release it with an enforceFrom later than ${version} first, so a release exists in which it is only a warning.`,
          )
        }
        continue
      }

      // 2. An optional feature gains a requirement that a working site doesn't meet.
      if (
        feature.tier === 'optional' &&
        earlier &&
        !setting.deprecated &&
        strength(setting) > strength(earlierSetting) &&
        setting.default === undefined &&
        !hasDeprecationWindow(feature, setting.name)
      ) {
        problems.push(
          `${setting.name} (${feature.title}) is newly required by a feature that already works without it. Give it a default (what happens when it is unset), or deprecate the setting it replaces with deprecated.replacedBy: "${setting.name}" so there is a window to move over.`,
        )
      }
    }
  }
  return problems
}
