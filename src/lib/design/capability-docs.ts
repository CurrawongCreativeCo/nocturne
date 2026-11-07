import {
  CAPABILITIES,
  CONTENT_SOURCES,
  FUTURE_COVERAGE,
  type CapabilityId,
  type ContentSourceDefinition,
} from './capabilities'
import {
  capabilityAvailability,
  currentBaseline,
  sourceAvailability,
  type AvailabilityCell,
  casesOf,
} from './capability-availability'
import { isCapabilityEvidence, type Evidence } from './capability-evidence'
import type { CapabilityException } from './capability-exceptions'
import type { ContractComponent } from './capability-policy'
import type { SchemaGate } from './schema-capabilities'

/**
 * The generated half of the README's "Design capability contract" (scripts/build-capability-docs.mjs,
 * `npm run design-capability-docs`): components by capabilities with policy and availability, the
 * baseline, the content sources, the reviewed exceptions and the parts of the site the contract doesn't
 * cover yet. Built from the declarations and the evidence, so it can't drift from them.
 */

export interface DocsInputs {
  components: readonly ContractComponent[]
  evidence: readonly Evidence[]
  gate: SchemaGate
  exceptions: readonly CapabilityException[]
}

const SHORT: Record<CapabilityId, string> = {
  surface: 'Surface',
  text: 'Text',
  header: 'Header',
  mark: 'Mark',
  depth: 'Depth',
  icon: 'Icon',
  action: 'Action',
  framing: 'Framing',
  pictureDepth: 'Pic. depth',
  overlay: 'Overlay',
  glass: 'Glass',
  divider: 'Divider',
  edge: 'Edge',
  motion: 'Motion',
  slots: 'Slots',
}

const cell = (text: string) => text.replaceAll('|', '\\|')

/** One matrix cell: R or C, then ✓ (verified), … (pending) or ◐ (partly), `*` when layouts opt out. */
function matrixCell(cells: readonly AvailabilityCell[]): string {
  const applicable = cells.filter((entry) => entry.policy !== 'notApplicable')
  if (applicable.length === 0) return '–'
  const letter = applicable.some((entry) => entry.policy === 'required') ? 'R' : 'C'
  const verified = applicable.filter((entry) => entry.status === 'verified').length
  const symbol = verified === applicable.length ? '✓' : verified === 0 ? '…' : '◐'
  const partial = cells.some((entry) => entry.scope !== null && entry.policy === 'notApplicable')
  return `${letter}${symbol}${partial ? '*' : ''}`
}

type PairStatus = 'verified' | 'partly' | 'pending'

/** Pairs (component, capability, scope, part) with their policy and status over their layouts. */
function pairs(
  components: readonly ContractComponent[],
  evidence: readonly Evidence[],
  gate: SchemaGate,
) {
  const found = new Map<string, { policy: 'required' | 'conditional'; statuses: string[] }>()
  for (const component of components) {
    for (const entry of capabilityAvailability(component, evidence, gate)) {
      if (entry.policy === 'notApplicable' || entry.scope === null) continue
      // A text role is a pair of its own: it is verified or pending apart from the others.
      const parts: [string, string][] = entry.roles?.length
        ? entry.roles.map((role) => [
            role,
            entry.verifiedRoles?.includes(role) ? 'verified' : 'pending',
          ])
        : [['', entry.status]]
      for (const [role, status] of parts) {
        const key = `${component.id}|${entry.capability}|${entry.scope}|${entry.part ?? ''}|${role}|${entry.policy}`
        const existing = found.get(key)
        if (existing) existing.statuses.push(status)
        else found.set(key, { policy: entry.policy, statuses: [status] })
      }
    }
  }
  return [...found.values()].map(({ policy, statuses }) => ({
    policy,
    status: statuses.every((status) => status === 'verified')
      ? 'verified'
      : statuses.every((status) => status === 'pending')
        ? 'pending'
        : 'partly',
  }))
}

const table = (headers: readonly string[], rows: readonly (readonly string[])[]) =>
  [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`),
  ].join('\n')

function sourceRows(
  components: readonly ContractComponent[],
  evidence: readonly Evidence[],
  gate: SchemaGate,
) {
  const rows = components.flatMap((component) => sourceAvailability(component, evidence, gate))
  return (CONTENT_SOURCES as readonly ContentSourceDefinition[]).map((source) => {
    const own = rows.filter((row) => row.source === source.id)
    const availability =
      own.length === 0
        ? 'pending (no component declares it yet)'
        : own.every((row) => row.status === 'verified')
          ? 'verified'
          : own.every((row) => row.status === 'pending')
            ? 'pending'
            : `verified on ${own
                .filter((row) => row.status === 'verified')
                .map((row) => row.layout ?? '')
                .join(', ')}`
    return [
      `\`${source.id}\``,
      source.component ? `\`${source.component}\`` : '–',
      availability,
      String(source.owner),
      source.gate ?? '–',
    ]
  })
}

/** The markdown between the README's markers. */
export function capabilityDocs({ components, evidence, gate, exceptions }: DocsInputs): string {
  const declared = components.filter((component) => component.declaration)
  const availability = new Map(
    declared.map((component) => [component.id, capabilityAvailability(component, evidence, gate)]),
  )

  const matrix = table(
    ['Component', ...CAPABILITIES.map(({ id }) => SHORT[id])],
    components.map((component) => [
      `${component.title} (\`${component.id}\`)${component.layouts.length > 0 ? `, ${String(component.layouts.length)} layouts` : ''}`,
      ...CAPABILITIES.map(({ id }) =>
        matrixCell(
          (availability.get(component.id) ?? []).filter((entry) => entry.capability === id),
        ),
      ),
    ]),
  )
  const owners = table(
    ['Capability', 'Owning task', 'What it does'],
    CAPABILITIES.map((capability) => [
      `${capability.title} (\`${capability.id}\`)`,
      String(capability.owner),
      capability.does,
    ]),
  )

  const counted = pairs(declared, evidence, gate)
  const count = (policy: 'required' | 'conditional', status: PairStatus) =>
    counted.filter((entry) => entry.policy === policy && entry.status === status).length
  const totals = table(
    [
      'Pairs (component, capability, scope, part and text role)',
      'Verified',
      'Partly verified',
      'Pending',
    ],
    (['required', 'conditional'] as const).map((policy) => [
      policy === 'required' ? 'Required' : 'Conditional',
      String(count(policy, 'verified')),
      String(count(policy, 'partly')),
      String(count(policy, 'pending')),
    ]),
  )

  const baseline = currentBaseline(declared, evidence, gate)
  const tasks = [
    ...new Set([...baseline.required, ...baseline.conditional].map((entry) => entry.closingTask)),
  ].sort((a, b) => a - b)
  const closing = table(
    ['Closing task', 'Required pending', 'Conditional pending'],
    tasks.map((task) => [
      String(task),
      String(baseline.required.filter((entry) => entry.closingTask === task).length),
      String(baseline.conditional.filter((entry) => entry.closingTask === task).length),
    ]),
  )

  const capabilityEvidence = evidence.filter(isCapabilityEvidence)
  const sourceEvidence = evidence.filter((entry) => !isCapabilityEvidence(entry))
  const cases = capabilityEvidence.flatMap(casesOf).length

  const exceptionTable = table(
    ['Component', 'Fields', 'Class', 'Nature', 'Reviewer', 'Removal task', 'Why it stays'],
    exceptions.map((row) => [
      `\`${row.component}\``,
      row.fields.map((field) => `\`${field}\``).join(', '),
      row.status,
      row.nature,
      row.reviewer,
      row.removalTask ? String(row.removalTask) : '–',
      row.justification,
    ]),
  )

  const future = table(
    ['Not covered by the contract', 'Capabilities it will need', 'Capability tasks', 'Declared by'],
    FUTURE_COVERAGE.map((part) => [
      part.part,
      part.needs.length > 0 ? part.needs.map((id) => SHORT[id]).join(', ') : 'Not assessed',
      part.tasks.length > 0
        ? part.tasks.join(', ') + ('note' in part ? ` (${part.note})` : '')
        : 'Set when declared',
      'declaredBy' in part ? `Task ${String(part.declaredBy)}` : 'Its capability tasks',
    ]),
  )
  const withoutTasks = FUTURE_COVERAGE.filter((part) => part.tasks.length === 0).length

  return [
    '**Components by capabilities.** `R` is Required and `C` Conditional. `✓` means every applicable layout and scope is verified, `…` none is yet, `◐` some are. `*` means some layouts or scopes opt out, with a reason in the declaration. `–` is Not applicable. The design manifest (`design-manifest.generated.json`) has the same by layout, with each policy, trigger, closing task and the evidence behind it.',
    matrix,
    totals,
    `A text role counts as a pair of its own, so one passing role never verifies another. Every Required or Conditional pair that is not verified is in \`capability-baseline.json\`, with the task that closes it. It only shrinks.`,
    closing,
    `**Evidence.** ${String(capabilityEvidence.length)} capability entries, ${String(cases)} cases (an entry's layouts are one case each). Each case renders the component with the field unset and then probed (a section through \`SectionRenderer\`; a slot block inside every host the registry allows it in, and all must pass; a listing or a view through its own drawer, \`VIEW_DRAWERS\`), and must change (or draw) the registered target, also with the claimed resolvers disconnected. The ${String(sourceEvidence.length)} content source entries are verified by tests written for each source, which the check requires to exist.`,
    '**Capabilities and their owners**',
    owners,
    '**Content sources** are recorded apart from design capabilities and never stand in for them. Generic tabs are deliberately not a capability.',
    table(
      ['Source', 'Component', 'Availability', 'Owning task', 'Approval gate'],
      sourceRows(declared, evidence, gate),
    ),
    '**Reviewed exceptions.** Fields in a Design group that no shared builder made. An exception records how a field was built; it is never evidence that a capability works.',
    exceptionTable,
    `**Not covered yet.** Parts of the site that are not sections, slot blocks or listings, so the manifest says nothing about them. ${String(withoutTasks)} have no capability task yet: the task in \`Declared by\` brings them into the contract, which is not ownership of their design capabilities. Each capability's own closing task is set when the part is declared.`,
    future,
  ].join('\n\n')
}

export const DOCS_START = '<!-- design-capabilities:start -->'
export const DOCS_END = '<!-- design-capabilities:end -->'

/** The README with the generated block replaced, or null when its markers are missing. */
export function spliceCapabilityDocs(readme: string, block: string): string | null {
  const start = readme.indexOf(DOCS_START)
  const end = readme.indexOf(DOCS_END)
  if (start === -1 || end === -1 || end < start) return null
  return `${readme.slice(0, start + DOCS_START.length)}\n\n${block}\n\n${readme.slice(end)}`
}
