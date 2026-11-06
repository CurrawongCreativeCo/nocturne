import {
  capabilityById,
  CONTENT_SOURCES,
  type CapabilityId,
  type ContentSourceDefinition,
  type ContentSourceId,
  type Scope,
  type TextRole,
  type Trigger,
} from './capabilities'
import { isCapabilityEvidence, type Evidence } from './capability-evidence'
import { applyPatch } from './capability-patch'
import {
  policyCells,
  type ContractComponent,
  type ContractProblem,
  type PolicyCell,
} from './capability-policy'
import type { SchemaGate } from './schema-capabilities'

/**
 * Availability (task 275): what a component offers today, worked out and never declared. A layout is
 * verified when the policy applies, the schema offers the evidence's field there, an evidence entry
 * registers a target, and (when results are given) its harness case changed that target. Without
 * results the evidence is taken as passing: the harness test in `npm run check` fails otherwise, so a
 * verified status can't reach main without a passing case.
 */

/** A harness case's result, by case id (`<evidence id>@<layout>`). */
export type CaseResults = ReadonlyMap<string, 'changed' | 'ignored' | 'missing'>

export const caseId = (entry: Evidence, layout: string | null) =>
  layout === null ? entry.id : `${entry.id}@${layout}`

/** The layouts an entry covers, as cases: `null` for a component with one layout. */
export const casesOf = (entry: Evidence): (string | null)[] =>
  entry.layouts ? [...entry.layouts] : [null]

const stateOf = (entry: Evidence) => applyPatch(applyPatch({}, entry.base), entry.probe)

export interface AvailabilityCell {
  capability: CapabilityId
  scope: Scope | null
  part?: string
  layout: string | null
  policy: PolicyCell['policy']
  status: 'verified' | 'pending' | 'notApplicable'
  reason?: string
  trigger?: Trigger
  /** For a conditional trigger with a stored path: whether that field exists today. */
  reachable?: boolean
  roles?: readonly TextRole[]
  closingTask?: number
  /** The harness cases that verify it. */
  evidence?: readonly string[]
  /** Why registered evidence doesn't verify it. */
  unverified?: string
}

export interface SourceAvailability {
  source: ContentSourceId
  layout: string | null
  status: 'verified' | 'pending'
  owner: number
  gate?: string
  evidence?: readonly string[]
  unverified?: string
}

const covers = (entry: Evidence, layout: string | null) =>
  layout === null ? !entry.layouts : (entry.layouts ?? []).includes(layout)

/** Why one evidence entry doesn't verify a layout, or undefined when it does. */
function shortfall(
  entry: Evidence,
  layout: string | null,
  gate: SchemaGate,
  results: CaseResults | undefined,
  capability?: CapabilityId,
): string | undefined {
  const field = gate.field(entry.component, entry.field)
  if ('missing' in field) return field.missing
  if (capability && field.marker.capability !== capability) {
    return `${entry.field} isn't marked as ${capability}`
  }
  const offered = gate.offered(entry.component, layout, entry.field, stateOf(entry))
  if (!offered.offered) return offered.reason
  const result = results?.get(caseId(entry, layout))
  if (results && result !== 'changed') {
    return `case ${caseId(entry, layout)} ${result === undefined ? 'did not run' : `found the target ${result}`}`
  }
  return undefined
}

/** Every declared cell of a component, with its availability. */
export function capabilityAvailability(
  component: ContractComponent,
  evidence: readonly Evidence[],
  gate: SchemaGate,
  results?: CaseResults,
): AvailabilityCell[] {
  const declaration = component.declaration
  if (!declaration) return []
  const cells: AvailabilityCell[] = []
  for (const [capability, entry] of Object.entries(declaration.capabilities) as [
    CapabilityId,
    (typeof declaration.capabilities)[CapabilityId],
  ][]) {
    for (const cell of policyCells(capability, entry, component.layouts)) {
      if (cell.policy === 'notApplicable') {
        cells.push({ ...cell, status: 'notApplicable' })
        continue
      }
      const matching = evidence.filter(
        (candidate) =>
          isCapabilityEvidence(candidate) &&
          candidate.component === component.id &&
          candidate.capability === capability &&
          candidate.scope === cell.scope &&
          (candidate.part ?? '') === (cell.part ?? '') &&
          covers(candidate, cell.layout),
      )
      const reasons = matching.map((candidate) => ({
        id: caseId(candidate, cell.layout),
        why: shortfall(candidate, cell.layout, gate, results, capability),
      }))
      const passing = reasons.filter((reason) => reason.why === undefined).map(({ id }) => id)
      const reachable =
        cell.trigger?.path === undefined || !gate.hasSchema(component.id)
          ? undefined
          : !('missing' in gate.field(component.id, cell.trigger.path))
      cells.push({
        ...cell,
        status: passing.length > 0 ? 'verified' : 'pending',
        ...(reachable === undefined ? {} : { reachable }),
        ...(passing.length > 0 ? { evidence: passing } : {}),
        ...(passing.length === 0 && reasons.length > 0
          ? { unverified: reasons.map(({ id, why }) => `${id}: ${why ?? ''}`).join('; ') }
          : {}),
      })
    }
  }
  return cells
}

/** A component's content sources, layout by layout, with their availability. */
export function sourceAvailability(
  component: ContractComponent,
  evidence: readonly Evidence[],
  gate: SchemaGate,
  results?: CaseResults,
): SourceAvailability[] {
  const layouts = component.layouts.length > 0 ? [...component.layouts] : [null]
  const rows: SourceAvailability[] = []
  for (const source of component.declaration?.contentSources ?? []) {
    const definition = (CONTENT_SOURCES as readonly ContentSourceDefinition[]).find(
      (candidate) => candidate.id === source,
    )
    for (const layout of layouts) {
      const matching = evidence.filter(
        (candidate) =>
          'source' in candidate &&
          candidate.source === source &&
          candidate.component === component.id &&
          covers(candidate, layout),
      )
      const reasons = matching.map((candidate) => ({
        id: caseId(candidate, layout),
        why: shortfall(candidate, layout, gate, results),
      }))
      const passing = reasons.filter((reason) => reason.why === undefined).map(({ id }) => id)
      rows.push({
        source,
        layout,
        status: passing.length > 0 ? 'verified' : 'pending',
        owner: definition?.owner ?? 0,
        ...(definition?.gate ? { gate: definition.gate } : {}),
        ...(passing.length > 0 ? { evidence: passing } : {}),
        ...(passing.length === 0 && reasons.length > 0
          ? { unverified: reasons.map(({ id, why }) => `${id}: ${why ?? ''}`).join('; ') }
          : {}),
      })
    }
  }
  return rows
}

/**
 * Evidence that claims more than it shows: an unknown or undeclared component, a layout the
 * declaration excludes, a field that doesn't exist or isn't marked, or one the schema doesn't offer.
 */
export function evidenceProblems(
  components: readonly ContractComponent[],
  evidence: readonly Evidence[],
  gate: SchemaGate,
): ContractProblem[] {
  const problems: ContractProblem[] = []
  const seen = new Set<string>()
  for (const entry of evidence) {
    const capability = isCapabilityEvidence(entry) ? entry.capability : undefined
    const problem = (message: string, fix: string) =>
      problems.push({
        component: entry.component,
        ...(capability ? { capability } : {}),
        message: `Evidence ${entry.id}: ${message}`,
        fix,
      })
    if (seen.has(entry.id)) problem('the id is used twice.', 'Give each entry its own id.')
    seen.add(entry.id)
    const component = components.find((candidate) => candidate.id === entry.component)
    if (!component) {
      problem(`${entry.component} isn't a component the contract covers.`, 'Remove the entry.')
      continue
    }
    if (!component.declaration) {
      problem(
        `${entry.component} has no declaration to verify.`,
        'Declare its capabilities first; evidence only verifies declared policy.',
      )
      continue
    }
    if (component.layouts.length > 0 && !entry.layouts?.length) {
      problem(
        `${entry.component} has layouts, and the entry names none.`,
        `Name the layouts it covers: ${component.layouts.join(', ')}.`,
      )
      continue
    }
    const unknown = (entry.layouts ?? []).filter((layout) => !component.layouts.includes(layout))
    if (unknown.length > 0) {
      problem(
        `it names layouts ${entry.component} doesn't have: ${unknown.join(', ')}.`,
        'Remove them.',
      )
      continue
    }
    const field = gate.field(entry.component, entry.field)
    if ('missing' in field) {
      problem(
        `its field doesn't exist (${field.missing}).`,
        'Point it at the field the probe sets.',
      )
      continue
    }
    if (isCapabilityEvidence(entry)) {
      if (field.marker.capability !== entry.capability) {
        problem(
          `${entry.field} isn't marked as ${entry.capability}${field.marker.capability ? ` (it is ${field.marker.capability})` : ''}.`,
          `Build the field with the ${capabilityById(entry.capability).title.toLowerCase()} builder, or probe the field that is.`,
        )
        continue
      }
      const declared = component.declaration.capabilities[entry.capability]
      const cells = policyCells(entry.capability, declared, component.layouts)
      for (const layout of casesOf(entry)) {
        const cell = cells.find(
          (candidate) =>
            candidate.scope === entry.scope &&
            (candidate.part ?? '') === (entry.part ?? '') &&
            candidate.layout === layout,
        )
        if (!cell || cell.policy === 'notApplicable') {
          problem(
            `the declaration has no policy for ${entry.capability} at scope ${entry.scope}${entry.part ? `, part ${entry.part}` : ''}${layout ? ` on ${layout}` : ''}.`,
            'Evidence verifies declared policy only: fix the declaration or the entry.',
          )
        }
      }
    } else if (!component.declaration.contentSources.includes(entry.source)) {
      problem(
        `${entry.component} doesn't declare the content source ${entry.source}.`,
        'Declare the source on the component first.',
      )
      continue
    }
    for (const layout of casesOf(entry)) {
      const offered = gate.offered(entry.component, layout, entry.field, stateOf(entry))
      if (!offered.offered) {
        problem(
          `the schema doesn't offer ${entry.field}${layout ? ` on ${layout}` : ''} (${offered.reason}).`,
          'A field the Studio hides for a layout is pending there: drop that layout from the entry.',
        )
      }
    }
  }
  return problems
}

// ---------------------------------------------------------------------------------------------------
// The ratchet

/** A pair (component, capability, scope, part) with the layouts still pending, and its closing task. */
export interface BaselineEntry {
  component: string
  capability: CapabilityId
  scope: Scope
  part?: string
  layouts: (string | null)[]
  closingTask: number
}

/** The committed legacy gaps: Required ones, and Conditional ones tracked explicitly. */
export interface CapabilityBaseline {
  required: BaselineEntry[]
  conditional: BaselineEntry[]
}

const pairKey = (entry: Pick<BaselineEntry, 'component' | 'capability' | 'scope' | 'part'>) =>
  `${entry.component}|${entry.capability}|${entry.scope}|${entry.part ?? ''}`

/** The pending pairs in some components' availability, grouped as the baseline lists them. */
export function pendingBaseline(
  availability: ReadonlyMap<string, readonly AvailabilityCell[]>,
): CapabilityBaseline {
  const groups: Record<'required' | 'conditional', Map<string, BaselineEntry>> = {
    required: new Map(),
    conditional: new Map(),
  }
  for (const [component, cells] of availability) {
    for (const cell of cells) {
      if (cell.status !== 'pending' || cell.scope === null) continue
      const policy = cell.policy === 'required' ? 'required' : 'conditional'
      const pair = {
        component,
        capability: cell.capability,
        scope: cell.scope,
        ...(cell.part ? { part: cell.part } : {}),
      }
      const existing = groups[policy].get(pairKey(pair))
      if (existing) existing.layouts.push(cell.layout)
      else
        groups[policy].set(pairKey(pair), {
          ...pair,
          layouts: [cell.layout],
          closingTask: cell.closingTask ?? capabilityById(cell.capability).owner,
        })
    }
  }
  return {
    required: [...groups.required.values()],
    conditional: [...groups.conditional.values()],
  }
}

/**
 * The baseline may only shrink: a pending pair or layout it doesn't list is a new gap, and one it lists
 * that is no longer pending must be removed. Entries for components a site has removed are ignored.
 */
export function ratchetProblems(
  current: CapabilityBaseline,
  committed: CapabilityBaseline,
  components: readonly string[],
): ContractProblem[] {
  const problems: ContractProblem[] = []
  for (const policy of ['required', 'conditional'] as const) {
    const listed = new Map(committed[policy].map((entry) => [pairKey(entry), entry]))
    const pending = new Map(current[policy].map((entry) => [pairKey(entry), entry]))
    for (const [key, entry] of pending) {
      const known = listed.get(key)
      const added = entry.layouts.filter((layout) => !known?.layouts.includes(layout))
      if (added.length > 0) {
        problems.push({
          component: entry.component,
          capability: entry.capability,
          message: `${entry.component}: ${entry.capability} (${policy}, ${entry.scope}${entry.part ? `, ${entry.part}` : ''}) is pending${added[0] === null ? '' : ` on ${added.join(', ')}`} and isn't in the baseline.`,
          fix: `A new component or layout adopts every capability that applies. Add evidence, or review the policy; the baseline (capability-baseline.json) only shrinks.`,
        })
      }
    }
    for (const [key, entry] of listed) {
      if (!components.includes(entry.component)) continue
      const still = pending.get(key)
      const closed = entry.layouts.filter((layout) => !still?.layouts.includes(layout))
      if (closed.length > 0) {
        problems.push({
          component: entry.component,
          capability: entry.capability,
          message: `${entry.component}: ${entry.capability} (${policy}, ${entry.scope}${entry.part ? `, ${entry.part}` : ''}) is no longer pending${closed[0] === null ? '' : ` on ${closed.join(', ')}`}, but the baseline still lists it.`,
          fix: 'Remove it from capability-baseline.json (npm run design-capabilities -- --update-baseline), so the baseline shrinks.',
        })
      }
    }
  }
  return problems
}
