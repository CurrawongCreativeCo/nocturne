import type {
  DesignManifest,
  ManifestField,
  ManifestSection,
  ManifestSlotBlock,
  ManifestStatus,
} from './types'

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

/**
 * Whether a policy governs a marked field: its evidence probes that field (or a field it contains), or
 * one in the same object (`cardDesign.border` stands for `cardDesign.background`: the same builder, at
 * the same scope). A top-level field has no object to share, so only the exact field counts. A field
 * built for a text role (`byRole`) never takes a sibling's evidence: `cardDesign.label` proves nothing
 * about `cardDesign.eyebrow`.
 */
const governs = (probed: string, path: string, byRole = false) => {
  if (path === probed || path.startsWith(`${probed}.`) || path.startsWith(`${probed}[`)) return true
  // A role's field is judged by that role's own evidence, never by the one beside it in the object.
  if (byRole) return false
  const object = (value: string) =>
    value.includes('.') ? value.slice(0, value.lastIndexOf('.')) : ''
  return object(probed) !== '' && object(probed) === object(path)
}

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

/**
 * What is wrong with setting one capability-marked field, if anything. The field is judged by the
 * policies that govern it (`governs`), never by the capability's other policies: a Verified sibling
 * can't authorise a Pending field, and a field no policy names isn't verified. A section with no
 * declaration for the capability can't be judged, so the value is rejected, never let through.
 */
function capabilityVerdict(
  section: ManifestSection,
  layout: string | null,
  path: string,
  capability: string,
  role?: string,
): CapabilityVerdict | undefined {
  const reject = (message: string): CapabilityVerdict => ({
    code: 'capability-not-verified',
    message,
  })
  if (!section.capabilities) {
    return reject(
      `${section.type} declares no design capabilities, so ${path} (a ${capability} setting) can't be judged.`,
    )
  }
  const entry = section.capabilities[capability]
  if (!entry) {
    return reject(
      `${path} is a ${capability} setting, and ${section.type} doesn't declare ${capability}.`,
    )
  }
  if ('notApplicable' in entry) {
    return reject(
      `${path} is a ${capability} setting, which ${section.type} doesn't offer: ${entry.notApplicable}.`,
    )
  }
  const named = entry.policies.filter((policy) =>
    policy.fields.some((field) => governs(field, path, role !== undefined)),
  )
  // A role's field is judged by its own role's status in the policy, not the policy's as a whole.
  const statusOfPolicy = (policy: (typeof entry.policies)[number]) =>
    role !== undefined && policy.roleAvailability
      ? statusAt(policy.roleAvailability[role] ?? 'pending', layout)
      : statusAt(policy.availability, layout)
  // A policy the layout opts out of doesn't count against a field another of its policies governs.
  const applicable = (named.length > 0 ? named : entry.policies).filter(
    (policy) => typeof statusOfPolicy(policy) === 'string',
  )
  if (applicable.length === 0) {
    const reasons = (named.length > 0 ? named : entry.policies).flatMap((policy) => {
      const status = statusOfPolicy(policy)
      return typeof status === 'object' ? [status.notApplicable] : []
    })
    return reject(
      `${path} is a ${capability} setting, which ${where(section, layout)} doesn't offer: ${[...new Set(reasons)].join('; ')}.`,
    )
  }
  if (named.length > 0 && applicable.every((policy) => statusOfPolicy(policy) === 'verified')) {
    return undefined
  }
  const open = applicable.filter((policy) => statusOfPolicy(policy) !== 'verified')
  const tasks = [
    ...new Set(open.flatMap((policy) => (policy.closingTask ? [policy.closingTask] : []))),
  ]
  const trigger = open.find((policy) => policy.trigger)?.trigger
  return reject(
    `${path} is a ${capability} setting that isn't verified on ${where(section, layout)} yet${named.length === 0 && applicable.some((policy) => statusOfPolicy(policy) === 'verified') ? `: no ${capability} policy names it` : ''}${tasks.length > 0 ? ` (pending: task ${tasks.join(', ')} closes it)` : ''}${trigger ? `. It applies when ${trigger.when.charAt(0).toLowerCase()}${trigger.when.slice(1)}` : ''}.`,
  )
}

/**
 * The slot block a marked row sits in, with its path inside the block: `supporting[badgeRow].badges[].icon`
 * is the badge row's `badges[].icon`, and `supporting[].…` names the only block the slot allows. A row
 * inside a block is the block's own field: the host section doesn't draw it, so the host's declaration
 * can't judge it.
 */
function slotBlockOf(
  section: ManifestSection,
  slots: DesignManifest['slots'] | undefined,
  path: string,
): { type: string | undefined; relative: string } | undefined {
  for (const slot of section.slots ?? []) {
    const prefix = `${slot.path}[`
    if (!path.startsWith(prefix)) continue
    const close = path.indexOf(']', prefix.length)
    if (close === -1 || path[close + 1] !== '.') return undefined
    const named = path.slice(prefix.length, close)
    const allowed = slots?.find((entry) => entry.slot === slot.slot)?.blocks ?? []
    return {
      type: named !== '' ? named : allowed.length === 1 ? allowed[0]?.type : undefined,
      relative: path.slice(close + 2),
    }
  }
  return undefined
}

/**
 * What is wrong with setting the marked fields on a section in this layout, if anything. A field inside a
 * slot block is judged by that block's contract (`slotBlocks`, the manifest's `designCapabilities`), on the
 * path inside the block, with no layout: a block is proven in every host it is allowed in. A block with no
 * contract in the manifest can't be judged, so the value is rejected.
 */
export function capabilityVerdicts(
  section: ManifestSection,
  layout: string | null,
  marked: readonly MarkedField[],
  context: { slots?: DesignManifest['slots']; slotBlocks?: readonly ManifestSlotBlock[] } = {},
): CapabilityVerdict[] {
  const verdicts: CapabilityVerdict[] = []
  const seen = new Set<string>()
  const ownsSurfaces = section.rules.find((rule) => rule.variant === layout)?.ownsSurfaces === true
  for (const { path, row } of marked) {
    const block = row.capability ? slotBlockOf(section, context.slots, path) : undefined
    if (block && row.capability) {
      const key = `block|${path}`
      if (seen.has(key)) continue
      seen.add(key)
      const contract = context.slotBlocks?.find((entry) => entry.type === block.type)
      if (!contract?.capabilities) {
        verdicts.push({
          code: 'capability-not-verified',
          message: `${path} is a ${row.capability} setting inside ${block.type ?? 'a slot block'}, which the manifest has no design contract for, so it can't be judged.`,
        })
        continue
      }
      const verdict = capabilityVerdict(
        { type: contract.type, fields: [], rules: [], capabilities: contract.capabilities },
        null,
        block.relative,
        row.capability,
        row.role,
      )
      if (verdict) verdicts.push(verdict)
      continue
    }
    if (row.capability === 'glass' && PANEL_FIELD.test(path) && ownsSurfaces) {
      verdicts.push({
        code: 'capability-not-verified',
        message: `${path} is the shared Panel, which ${where(section, layout)} doesn't offer: it draws its own surfaces.`,
      })
      continue
    }
    if (row.capability) {
      const key = `capability|${path}`
      if (!seen.has(key)) {
        seen.add(key)
        const verdict = capabilityVerdict(section, layout, path, row.capability, row.role)
        if (verdict) verdicts.push(verdict)
      }
    }
    if (row.contentSource) {
      const key = `source|${path}`
      if (seen.has(key)) continue
      seen.add(key)
      if (!section.contentSources) {
        verdicts.push({
          code: 'content-source-not-verified',
          message: `${section.type} records no content sources, so ${path} (the ${row.contentSource} source) can't be judged.`,
        })
        continue
      }
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
