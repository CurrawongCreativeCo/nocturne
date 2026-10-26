import type { FeatureConfig, FeatureSetting } from '@/config/feature-config'
import type { FeatureReport, SetupReport } from '@/lib/config/evaluate'

import {
  CANT_CHECK_GITHUB,
  CANT_CHECK_OTHER,
  CHECK_READINESS,
  deploymentHeader,
  EXPLANATIONS_ONLY_REASON,
  GROUP_TITLE,
  REDEPLOY_STEP,
  SETTING_WHERE,
  SETUP_FOOTER,
  STATUS_LABEL,
} from './setup-wording'

/** What `GET /api/setup-status` answers (`getSetupStatus()`): setting names and words, never a value. */
export interface SetupStatusResponse extends SetupReport {
  templateVersion: string
  tier: string
  enabled: Record<string, boolean>
  commit: string | null
  builtAt: string | null
}

export type SetupGroupId = 'attention' | 'cant-check' | 'ready' | 'off'

export interface FeatureRow {
  id: string
  title: string
  summary: string
  /** Null when there is no status to show (explanations only). */
  group: SetupGroupId | null
  statusLabel: string | null
  /** One line about the state, or the feature's summary when there is no status. */
  message: string
  /** Introduced in the template's current minor version. */
  isNew: boolean
}

export interface SetupGroup {
  id: SetupGroupId
  title: string
  rows: FeatureRow[]
}

export interface SetupView {
  mode: 'status' | 'explanations'
  /** "This deployment: …", or null without a status. */
  header: string | null
  footer: string
  /** Explanations only: why there is no status, and where to get one. */
  note: string | null
  /** Status only, in the order Needs attention, Can't be checked, Ready, Off. Empty groups are left out. */
  groups: SetupGroup[]
  /** Explanations only: every feature, in registry order. */
  rows: FeatureRow[]
  /** Features introduced in the current minor version, for "New in 1.9". Status only. */
  newIn: { label: string; rows: FeatureRow[] } | null
  /** How many features are not set up (Start here's line). */
  attentionCount: number
}

/** Why the pane has no status. */
export type ExplanationsReason = keyof typeof EXPLANATIONS_ONLY_REASON

/** "1.9.0" → "1.9". Null for anything that isn't a version. */
export function minorOf(version: string): string | null {
  const match = /^(\d+)\.(\d+)(?:\.|$)/.exec(version)
  return match ? `${match[1]}.${match[2]}` : null
}

/** True when the feature needs a setting in GitHub, which Studio can never see. */
export function isGithubBacked(feature: FeatureConfig): boolean {
  return feature.settings.some(
    (setting) =>
      setting.where === 'github' &&
      !setting.deprecated &&
      !setting.planned &&
      setting.required !== false,
  )
}

function groupFor(feature: FeatureConfig, report: FeatureReport | undefined): SetupGroupId {
  if (!report) return 'cant-check'
  if (report.status === 'off') return 'off'
  if (report.status === 'not-set-up') return 'attention'
  // Never Ready while any part lives where Studio can't look.
  if (report.status === 'cant-check' || isGithubBacked(feature)) return 'cant-check'
  return 'ready'
}

function messageFor(feature: FeatureConfig, group: SetupGroupId, report?: FeatureReport) {
  if (group === 'attention') return report?.reason ?? STATUS_LABEL.attention
  if (group === 'cant-check') return isGithubBacked(feature) ? CANT_CHECK_GITHUB : CANT_CHECK_OTHER
  if (group === 'off') return "Switched off in this site's profile, so it isn't running."
  return feature.summary
}

/**
 * Everything the Features & setup list shows, from the registry text bundled with Studio and, when
 * the route answered, the status. Without a status every feature is just its explanation: nothing
 * about readiness is guessed or taken from anywhere else (§R.1). Pure: the component lays it out.
 */
export function buildSetupView({
  features,
  status,
  noStatusReason = 'refused',
}: {
  features: readonly FeatureConfig[]
  status: SetupStatusResponse | null
  noStatusReason?: ExplanationsReason
}): SetupView {
  if (!status) {
    return {
      mode: 'explanations',
      header: null,
      footer: SETUP_FOOTER,
      note: `${EXPLANATIONS_ONLY_REASON[noStatusReason]} ${CHECK_READINESS}`,
      groups: [],
      rows: features.map((feature) => ({
        id: feature.id,
        title: feature.title,
        summary: feature.summary,
        group: null,
        statusLabel: null,
        message: feature.summary,
        isNew: false,
      })),
      newIn: null,
      attentionCount: 0,
    }
  }

  const reports = new Map(status.features.map((report) => [report.id, report]))
  const currentMinor = minorOf(status.templateVersion)
  const rows = features.map((feature): FeatureRow => {
    const report = reports.get(feature.id)
    const group = groupFor(feature, report)
    return {
      id: feature.id,
      title: feature.title,
      summary: feature.summary,
      group,
      statusLabel: STATUS_LABEL[group],
      message: messageFor(feature, group, report),
      isNew: currentMinor !== null && minorOf(feature.since) === currentMinor,
    }
  })

  const order: SetupGroupId[] = ['attention', 'cant-check', 'ready', 'off']
  const groups = order
    .map((id) => ({ id, title: GROUP_TITLE[id], rows: rows.filter((row) => row.group === id) }))
    .filter((group) => group.rows.length > 0)
  const fresh = rows.filter((row) => row.isNew)

  return {
    mode: 'status',
    header: deploymentHeader(status.commit, status.builtAt),
    footer: SETUP_FOOTER,
    note: null,
    groups,
    rows: [],
    newIn: fresh.length > 0 ? { label: `New in ${currentMinor}`, rows: fresh } : null,
    attentionCount: rows.filter((row) => row.group === 'attention').length,
  }
}

/** Start here's count: features that are on and missing something they need. Zero without a status. */
export function attentionCount(status: SetupStatusResponse | null): number {
  return status ? status.features.filter((feature) => feature.status === 'not-set-up').length : 0
}

export interface NeedRow {
  name: string
  where: string
  /** Vercel environments, when it lives there. */
  targets: string | null
  timing: 'Built into the pages' | 'Read while the site runs'
  requirement: string
  /** Null when Studio has no status, or nothing is known about this one. */
  presence: 'Set' | 'Not set' | 'Set, but needs fixing' | "Can't be checked from here" | null
  purpose: string | null
  source: string | null
}

export interface TechnicalRow {
  name: string
  details: string[]
}

export interface FeatureDetail {
  id: string
  title: string
  statusLabel: string | null
  group: SetupGroupId | null
  /** The state in a sentence, or null without a status. */
  message: string | null
  whatItDoes: string
  why: string
  withoutIt: string
  needs: NeedRow[]
  /** Numbered; the last one is always "Redeploy, then reopen this pane." */
  steps: string[]
  technical: TechnicalRow[]
  docs: string
  /** Where to check readiness when the status can't say. */
  howToCheck: string | null
}

const live = (setting: FeatureSetting) => !setting.deprecated && !setting.planned

function requirementOf(setting: FeatureSetting): string {
  if (setting.required === true) return 'Needed'
  if (typeof setting.required === 'object') return `Needed once ${setting.required.when} is set`
  return 'Optional'
}

function presenceOf(
  setting: FeatureSetting,
  report: FeatureReport | undefined,
): NeedRow['presence'] {
  if (!report) return null
  if (setting.where === 'github' || setting.where === 'sanity') {
    return setting.required === false ? null : "Can't be checked from here"
  }
  if (report.missing.includes(setting.name)) return 'Not set'
  if (report.invalid.some((item) => item.name === setting.name)) return 'Set, but needs fixing'
  return setting.required === true ? 'Set' : null
}

function stepsFor(feature: FeatureConfig): string[] {
  const written = feature.setup ?? []
  const generated = feature.settings
    .filter((setting) => live(setting) && setting.required === true)
    .map((setting) => {
      const where = SETTING_WHERE[setting.where]
      return `Set ${setting.name} in ${where}${setting.source ? `. ${setting.source}` : ''}.`
    })
  const steps = written.length > 0 ? [...written] : generated
  return [...steps, REDEPLOY_STEP]
}

function technicalFor(setting: FeatureSetting): TechnicalRow {
  const details = [
    `Kind: ${setting.kind}`,
    `Where: ${SETTING_WHERE[setting.where]}`,
    ...(setting.targets?.length ? [`Targets: ${setting.targets.join(', ')}`] : []),
    `Read: ${setting.buildTime ? 'while building' : 'while the site runs'}`,
    `Needed: ${requirementOf(setting).toLowerCase()}`,
    ...(setting.format ? [`Format: ${setting.format}`] : []),
    ...(setting.default ? [`When unset: ${setting.default}`] : []),
    ...(setting.since ? [`Since: ${setting.since}`] : []),
    ...(setting.deprecated
      ? [
          `Deprecated: replaced by ${setting.deprecated.replacedBy}. ${setting.deprecated.migration}`,
        ]
      : []),
    ...(setting.planned ? ['Not used yet: registered for a later release'] : []),
  ]
  return { name: setting.name, details }
}

/** One feature's detail view: the six parts of §C.7 in order, plus the technical disclosure. */
export function buildFeatureDetail(
  feature: FeatureConfig,
  status: SetupStatusResponse | null,
): FeatureDetail {
  const report = status?.features.find((item) => item.id === feature.id)
  const group = status ? groupFor(feature, report) : null
  return {
    id: feature.id,
    title: feature.title,
    statusLabel: group ? STATUS_LABEL[group] : null,
    group,
    message: group ? messageFor(feature, group, report) : null,
    whatItDoes: feature.summary,
    why: feature.why,
    withoutIt: feature.withoutIt,
    needs: feature.settings.filter(live).map((setting) => ({
      name: setting.name,
      where: SETTING_WHERE[setting.where],
      targets: setting.targets?.length ? setting.targets.join(', ') : null,
      timing: setting.buildTime ? 'Built into the pages' : 'Read while the site runs',
      requirement: requirementOf(setting),
      presence: status ? presenceOf(setting, report) : null,
      purpose: setting.purpose ?? null,
      source: setting.source ?? null,
    })),
    steps: stepsFor(feature),
    technical: feature.settings.map(technicalFor),
    docs: feature.docs,
    howToCheck:
      group === null
        ? CHECK_READINESS
        : group === 'cant-check'
          ? isGithubBacked(feature)
            ? CANT_CHECK_GITHUB
            : CANT_CHECK_OTHER
          : null,
  }
}
