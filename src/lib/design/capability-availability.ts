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
import type { BaselineChange } from './capability-baseline-changes'
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
 * Evidence that rests on tests written for it: a content source is verified by them
 * (SourceEvidence.tests), and a placement is proven by the ones that measure it in a browser
 * (CapabilityEvidence.measured). Each named case must exist in its file, and the file must not skip,
 * focus or fail tests on purpose. The tests themselves run in `npm test` or the e2e jobs; this checks
 * they can't be deleted or switched off while the claim stays verified.
 */
export function sourceTestProblems(
  evidence: readonly Evidence[],
  read: (path: string) => string | undefined,
): ContractProblem[] {
  const problems: ContractProblem[] = []
  for (const entry of evidence) {
    const isSource = 'source' in entry
    const measured = isSource ? undefined : entry.measured
    const named = isSource ? entry.tests : (measured ?? [])
    const placement = !isSource && entry.part === 'placement'
    if (!isSource && !placement && measured === undefined) continue
    const problem = (message: string, fix: string) =>
      problems.push({
        component: entry.component,
        ...(isSource ? {} : { capability: entry.capability }),
        message: `Evidence ${entry.id}: ${message}`,
        fix,
      })
    const fix = isSource
      ? 'A content source is verified only by tests written for it: write the test, or take the case out of the evidence (the source is then pending).'
      : 'Placement is verified only by tests that measure it in a browser: write them and name them in `measured`, or take the evidence out (the placement is then pending).'
    if (named.length === 0) {
      problem(
        isSource ? 'it names no tests.' : 'placement evidence names no browser measurements.',
        fix,
      )
    }
    for (const { file, cases } of named) {
      const text = read(file)
      if (text === undefined) {
        problem(`its test file ${file} doesn't exist.`, fix)
        continue
      }
      if (/\b(it|test|describe)\.(skip|todo|only|fails)\b|\bx(it|describe)\(/.test(text)) {
        problem(`${file} skips, focuses or expects failure in a test.`, fix)
      }
      for (const name of cases) {
        if (!text.includes(name)) problem(`${file} has no test "${name}".`, fix)
      }
    }
  }
  return problems
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
    // A slot block is proven inside its hosts: with none, there is nowhere to draw it.
    if (component.kind === 'slotBlock' && (component.hosts ?? []).length === 0) {
      problem(
        `${entry.component} is a slot block that no slot lists, so there is no host to prove it in.`,
        'Add the block to a slot in the registry (features/pages/slots/registry.ts), or remove the evidence.',
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

/** Every component's pending pairs today: what the committed baseline must equal. */
export function currentBaseline(
  components: readonly ContractComponent[],
  evidence: readonly Evidence[],
  gate: SchemaGate,
): CapabilityBaseline {
  return pendingBaseline(
    new Map(
      components.map((component) => [
        component.id,
        capabilityAvailability(component, evidence, gate),
      ]),
    ),
  )
}

/** The gaps pending now that the committed baseline doesn't list: what `--update-baseline` may add. */
export function addedGaps(current: CapabilityBaseline, committed: CapabilityBaseline) {
  const listed = listedCells(committed)
  return [...listedCells(current)].filter(([key]) => !listed.has(key)).map(([, cell]) => cell)
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
    for (const [key, entry] of pending) {
      const known = listed.get(key)
      if (known && known.closingTask !== entry.closingTask) {
        problems.push({
          component: entry.component,
          capability: entry.capability,
          message: `${entry.component}: ${entry.capability} (${policy}, ${entry.scope}${entry.part ? `, ${entry.part}` : ''}) closes with task ${entry.closingTask}, but the baseline says task ${known.closingTask}.`,
          fix: 'Reassigning a gap is a reviewed change: update the baseline (npm run design-capabilities -- --update-baseline) in the same commit as the declaration, and say why in the pull request.',
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

// ---------------------------------------------------------------------------------------------------
// Baseline integrity: the baseline against the one on the base commit

const rowCovers = (
  row: Pick<BaselineChange, 'component' | 'capability' | 'scope' | 'part' | 'layouts'>,
  pair: Pick<BaselineEntry, 'component' | 'capability' | 'scope' | 'part'>,
  layout: string | null,
) =>
  row.component === pair.component &&
  row.capability === pair.capability &&
  row.scope === pair.scope &&
  (row.part ?? '') === (pair.part ?? '') &&
  row.layouts.includes(layout)

const describePair = (pair: BaselineEntry, layout: string | null, policy: string) =>
  `${pair.component}: ${pair.capability} (${policy}, ${pair.scope}${pair.part ? `, ${pair.part}` : ''})${layout === null ? '' : ` on ${layout}`}`

/** Every (pair, layout) a baseline lists, keyed, with the policy list it is in. */
function listedCells(baseline: CapabilityBaseline) {
  const cells = new Map<string, { pair: BaselineEntry; layout: string | null; policy: string }>()
  for (const policy of ['required', 'conditional'] as const) {
    for (const pair of baseline[policy]) {
      for (const layout of pair.layouts) {
        cells.set(`${policy}|${pairKey(pair)}|${layout ?? ''}`, { pair, layout, policy })
      }
    }
  }
  return cells
}

/** Rows that are incomplete: no reason, reviewer or review date, or no layouts. */
export function changeRowProblems(changes: readonly BaselineChange[]): ContractProblem[] {
  const problems: ContractProblem[] = []
  for (const row of changes) {
    const where = `${row.component}: ${row.capability} (${row.scope}${row.part ? `, ${row.part}` : ''})`
    const problem = (message: string, fix: string) =>
      problems.push({ component: row.component, capability: row.capability, message, fix })
    if (!row.reason.trim()) {
      problem(`${where}: its baseline change (${row.kind}) has no reason.`, 'Say why.')
    }
    if (!row.reviewer.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(row.reviewed)) {
      problem(
        `${where}: its baseline change (${row.kind}) has no reviewer and review date.`,
        'Record who reviewed it, and when (capability-baseline-changes.ts).',
      )
    }
    if (row.layouts.length === 0) {
      problem(
        `${where}: its baseline change (${row.kind}) names no layouts.`,
        'Name the layouts it covers.',
      )
    }
    if (row.kind === 'downgrade' && row.closingTask !== undefined) {
      problem(
        `${where}: a downgrade names a closing task.`,
        'A downgrade closes nothing: drop the task.',
      )
    }
  }
  return problems
}

/**
 * What the baseline's reviewed register and the current availability say about the committed baseline
 * (`head`) alone: an admit row must cover a pair that is pending now and listed, with the task the
 * baseline gives it; a downgrade row must cover a cell the policy now says is Not applicable. Anything
 * else is stale and fails, so a row can't outlive the thing it explained.
 */
export function staleChangeProblems(
  head: CapabilityBaseline,
  availability: ReadonlyMap<string, readonly AvailabilityCell[]>,
  changes: readonly BaselineChange[],
): ContractProblem[] {
  const problems: ContractProblem[] = []
  const listed = listedCells(head)
  for (const row of changes) {
    const where = `${row.component}: ${row.capability} (${row.scope}${row.part ? `, ${row.part}` : ''})`
    const stale = (message: string, fix: string) =>
      problems.push({ component: row.component, capability: row.capability, message, fix })
    for (const layout of row.layouts) {
      const on = layout === null ? '' : ` on ${layout}`
      if (row.kind === 'admit') {
        const hit = [...listed.values()].find(
          ({ pair, layout: listedLayout }) =>
            listedLayout === layout && rowCovers(row, pair, layout),
        )
        if (!hit) {
          stale(
            `${where}${on}: an admit row covers a gap the baseline doesn't list (it is closed, or never pending).`,
            'Delete the row from capability-baseline-changes.ts.',
          )
        } else if (row.closingTask !== undefined && row.closingTask !== hit.pair.closingTask) {
          stale(
            `${where}${on}: the admit row says task ${row.closingTask}, the baseline says task ${hit.pair.closingTask}.`,
            'Make them agree.',
          )
        }
      } else {
        const cells = availability.get(row.component) ?? []
        const matching = cells.filter(
          (cell) =>
            cell.capability === row.capability &&
            cell.layout === layout &&
            (cell.scope === null || cell.scope === row.scope) &&
            (cell.part ?? '') === (row.part ?? ''),
        )
        const notApplicable =
          matching.length > 0 && matching.every((cell) => cell.status === 'notApplicable')
        const declared = cells.some(
          (cell) =>
            cell.capability === row.capability &&
            cell.layout === layout &&
            cell.scope === row.scope &&
            (cell.part ?? '') === (row.part ?? '') &&
            cell.status !== 'notApplicable',
        )
        if (!notApplicable || declared) {
          stale(
            `${where}${on}: a downgrade row covers a cell the policy doesn't say is Not applicable.`,
            'Delete the row, or make the policy Not applicable with its reason.',
          )
        }
      }
    }
  }
  return problems
}

export interface BaselineIntegrityInputs {
  /** The baseline on the base commit (the merge base, or the base branch). */
  base: CapabilityBaseline
  /** The baseline in this checkout. */
  head: CapabilityBaseline
  /** The components this site has: entries for others (a section a client removed) are ignored. */
  components: readonly string[]
  /** Every component's availability today: what a removed gap is judged against. */
  availability: ReadonlyMap<string, readonly AvailabilityCell[]>
  changes: readonly BaselineChange[]
}

/**
 * The baseline against its base commit. A pair or layout that was added needs an admit row. One that was
 * removed must be verified now (evidence closed it), or Not applicable with a downgrade row: a pair that
 * is still pending, or that was only deleted by hand, fails. The static ratchet already makes the
 * baseline equal what is pending today, so these two checks together mean the file can only change by
 * evidence or by a reviewed row.
 */
export function baselineIntegrityProblems({
  base,
  head,
  components,
  availability,
  changes,
}: BaselineIntegrityInputs): ContractProblem[] {
  const problems: ContractProblem[] = []
  const before = listedCells(base)
  const after = listedCells(head)
  for (const [key, { pair, layout, policy }] of after) {
    if (before.has(key) || !components.includes(pair.component)) continue
    if (changes.some((row) => row.kind === 'admit' && rowCovers(row, pair, layout))) continue
    problems.push({
      component: pair.component,
      capability: pair.capability,
      message: `${describePair(pair, layout, policy)} is in the baseline now and wasn't on the base commit, and no admit row covers it.`,
      fix: 'A gap is never added by hand. Add evidence for it, or, if it genuinely cannot close in this task, add a reviewed admit row (src/lib/design/capability-baseline-changes.ts) with the reason and the task that closes it.',
    })
  }
  for (const [key, { pair, layout, policy }] of before) {
    if (after.has(key) || !components.includes(pair.component)) continue
    const cells = (availability.get(pair.component) ?? []).filter(
      (cell) =>
        cell.capability === pair.capability &&
        cell.layout === layout &&
        cell.scope === pair.scope &&
        (cell.part ?? '') === (pair.part ?? ''),
    )
    if (cells.length > 0 && cells.every((cell) => cell.status === 'verified')) continue
    const pending = cells.some((cell) => cell.status === 'pending')
    if (
      !pending &&
      changes.some((row) => row.kind === 'downgrade' && rowCovers(row, pair, layout))
    ) {
      continue
    }
    problems.push({
      component: pair.component,
      capability: pair.capability,
      message: pending
        ? `${describePair(pair, layout, policy)} was on the base commit's baseline, is gone from it now, and is still pending.`
        : `${describePair(pair, layout, policy)} was on the base commit's baseline and is gone from it, but it isn't verified: its policy changed to Not applicable (or it was removed) and no downgrade row says why.`,
      fix: pending
        ? 'Only evidence closes a gap. Restore the entry, or add the evidence that verifies it.'
        : 'Add a reviewed downgrade row (src/lib/design/capability-baseline-changes.ts) with the reason the component never needed it, or restore the policy.',
    })
  }
  return problems
}
