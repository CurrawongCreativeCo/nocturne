import type { ManifestField, ManifestSection, ManifestStatus } from './types'

/**
 * Whether a change proposal may set a value the design capability contract governs (task 275;
 * README, "Design capability contract" and "Change proposals"): a field a shared design builder
 * marked as a capability, or one a content source's evidence names. The value must be **verified** for
 * the section's layout. Anything else is rejected with the reason (not offered there, or pending, with
 * the task that closes it), so a proposal can never ask for a design that the renderer won't draw.
 * Fields that carry no capability keep their ordinary manifest checks. Pure: the manifest is passed in.
 */

export interface MarkedField {
  /** The manifest path of the row, relative to the section (`style.panel`, `links[].design.border`). */
  path: string
  row: ManifestField
}

export interface CapabilityVerdict {
  code: 'capability-not-verified' | 'content-source-not-verified'
  message: string
}

/** The layout a section is drawn in: the stored one, else the first (the default), else none. */
export function layoutOfSection(section: ManifestSection, stored: unknown): string | null {
  const known = new Set((section.variants ?? []).map((variant) => variant.value))
  if (typeof stored === 'string' && known.has(stored)) return stored
  return section.variants?.[0]?.value ?? null
}

const matches = (field: string, path: string) =>
  path === field || path.startsWith(`${field}.`) || path.startsWith(`${field}[`)

/** What a policy or source offers in one layout: `verified`, `pending` or `{ notApplicable: reason }`. */
function statusAt(
  availability: ManifestStatus | Record<string, ManifestStatus>,
  layout: string | null,
): ManifestStatus {
  if (typeof availability === 'string') return availability
  if ('notApplicable' in availability && typeof availability.notApplicable === 'string') {
    return { notApplicable: availability.notApplicable }
  }
  const byLayout = availability as Record<string, ManifestStatus>
  return (layout === null ? undefined : byLayout[layout]) ?? 'pending'
}

const where = (section: ManifestSection, layout: string | null) =>
  layout === null || (section.variants?.length ?? 0) < 2
    ? section.type
    : `${section.type} (${layout} layout)`

/** The shared Panel's own fields: where a layout draws its own surfaces they are never offered. */
const PANEL_FIELD = /(^|\.)panel(Strength)?$/

/** What is wrong with setting the marked fields on a section in this layout, if anything. */
export function capabilityVerdicts(
  section: ManifestSection,
  layout: string | null,
  marked: readonly MarkedField[],
): CapabilityVerdict[] {
  const verdicts: CapabilityVerdict[] = []
  const seen = new Set<string>()
  const ownsSurfaces = section.rules.find((rule) => rule.variant === layout)?.ownsSurfaces === true
  for (const { path, row } of marked) {
    if (row.capability === 'glass' && PANEL_FIELD.test(path) && ownsSurfaces) {
      verdicts.push({
        code: 'capability-not-verified',
        message: `${path} is the shared Panel, which ${where(section, layout)} doesn't offer: it draws its own surfaces.`,
      })
      continue
    }
    if (row.capability && section.capabilities) {
      const key = `capability|${path}`
      if (seen.has(key)) continue
      seen.add(key)
      const entry = section.capabilities[row.capability]
      if (!entry) {
        verdicts.push({
          code: 'capability-not-verified',
          message: `${path} is a ${row.capability} setting, and ${section.type} doesn't declare ${row.capability}.`,
        })
        continue
      }
      if ('notApplicable' in entry) {
        verdicts.push({
          code: 'capability-not-verified',
          message: `${path} is a ${row.capability} setting, which ${section.type} doesn't offer: ${entry.notApplicable}.`,
        })
        continue
      }
      const named = entry.policies.filter((policy) => policy.fields.some((f) => matches(f, path)))
      const candidates = named.length > 0 ? named : entry.policies
      const statuses = candidates.map((policy) => ({
        policy,
        status: statusAt(policy.availability, layout),
      }))
      if (statuses.some(({ status }) => status === 'verified')) continue
      const reasons = statuses.flatMap(({ status }) =>
        typeof status === 'object' ? [status.notApplicable] : [],
      )
      if (statuses.length > 0 && reasons.length === statuses.length) {
        verdicts.push({
          code: 'capability-not-verified',
          message: `${path} is a ${row.capability} setting, which ${where(section, layout)} doesn't offer: ${[...new Set(reasons)].join('; ')}.`,
        })
        continue
      }
      const pending = statuses.find(({ status }) => status === 'pending')?.policy
      verdicts.push({
        code: 'capability-not-verified',
        message: `${path} is a ${row.capability} setting that isn't verified on ${where(section, layout)} yet${pending?.closingTask ? ` (pending: task ${String(pending.closingTask)} closes it)` : ''}${pending?.trigger ? `. It applies when ${pending.trigger.when.charAt(0).toLowerCase()}${pending.trigger.when.slice(1)}` : ''}.`,
      })
    }
    if (row.contentSource && section.contentSources) {
      const key = `source|${path}`
      if (seen.has(key)) continue
      seen.add(key)
      const source = section.contentSources[row.contentSource]
      const status = source ? statusAt(source.availability, layout) : 'pending'
      if (status !== 'verified') {
        verdicts.push({
          code: 'content-source-not-verified',
          message: `${path} feeds the ${row.contentSource} content source, which isn't verified on ${where(section, layout)}${source?.gate ? ` (it needs: ${source.gate})` : ''}.`,
        })
      }
    }
  }
  return verdicts
}
