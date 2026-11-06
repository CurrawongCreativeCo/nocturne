import {
  CAPABILITIES,
  CONTENT_SOURCES,
  FUTURE_COVERAGE,
  TEXT_ROLES,
  type CapabilityId,
  type ContentSourceId,
  type Scope,
  type TextRole,
  type Trigger,
} from './capabilities'
import {
  capabilityAvailability,
  sourceAvailability,
  type AvailabilityCell,
} from './capability-availability'
import {
  EVIDENCE,
  isCapabilityEvidence,
  type CapabilityEvidence,
  type Evidence,
  type SourceEvidence,
} from './capability-evidence'
import type { ContractComponent } from './capability-policy'
import type { SchemaGate } from './schema-capabilities'

/**
 * The design manifest's view of the capability contract (scripts/build-design-manifest.mjs): per
 * component, each capability's policy with its availability layout by layout and the evidence behind
 * it, and the content sources apart. Pure and JSON-shaped.
 */

/** A layout's availability: verified, pending, or not applicable with the reason. */
export type LayoutStatus = 'verified' | 'pending' | { notApplicable: string }

export interface ManifestPolicy {
  policy: 'required' | 'conditional'
  scope: Scope
  part?: string
  roles?: readonly TextRole[]
  trigger?: Trigger & { reachable?: boolean }
  /** The task that closes what is still pending. */
  closingTask: number
  /**
   * The schema fields its evidence probes (manifest paths), so a change proposal can tell which policy a
   * marked field belongs to. A field no evidence names is judged by the capability's policies together.
   */
  fields: readonly string[]
  /** One status, or one per layout for a component with layouts. Verified only when every role is. */
  availability: LayoutStatus | Readonly<Record<string, LayoutStatus>>
  /**
   * For a policy that names text roles: each role's own availability, shaped as `availability` is. A
   * role a layout doesn't draw is Not applicable there, with the layout's reason; a role is verified only
   * by an entry that names it. A change proposal judges a role's field by this, never by a sibling's.
   */
  roleAvailability?: Partial<
    Record<TextRole, LayoutStatus | Readonly<Record<string, LayoutStatus>>>
  >
}

export interface ManifestEvidence {
  id: string
  field: string
  /** Each `module#export` the renderer reaches the target through. */
  resolvers: readonly string[]
  render: string
  target: string
  /** The harness cases that run it. */
  cases: readonly string[]
  /** The browser tests that measure what the harness can't (a placement), by file and case. */
  measured?: readonly { file: string; cases: readonly string[] }[]
}

export type ManifestCapability =
  | { notApplicable: string }
  | { policies: readonly ManifestPolicy[]; evidence: readonly ManifestEvidence[] }

export interface ManifestSource {
  owner: number
  gate?: string
  /** The schema fields its evidence probes: change proposals treat them as this source's. */
  fields: readonly string[]
  /** The tests written for this source, by file and case: what verifies it. */
  tests: readonly { file: string; cases: readonly string[] }[]
  /** The resolvers it comes through (each checked to exist). */
  resolvers: readonly string[]
  availability: 'verified' | 'pending' | Readonly<Record<string, 'verified' | 'pending'>>
}

export interface ComponentContract {
  capabilities: Partial<Record<CapabilityId, ManifestCapability>>
  contentSources: Partial<Record<ContentSourceId, ManifestSource>>
}

const statusOf = (cell: AvailabilityCell): LayoutStatus =>
  cell.status === 'notApplicable' ? { notApplicable: cell.reason ?? '' } : cell.status

function evidenceFor(
  entries: readonly CapabilityEvidence[],
  cases: readonly string[],
): ManifestEvidence[] {
  return entries
    .map((entry) => ({
      id: entry.id,
      field: entry.field,
      resolvers: entry.resolvers.map((resolver) => `${resolver.module}#${resolver.export}`),
      render: entry.render,
      target: entry.target,
      cases: cases.filter((id) => id === entry.id || id.startsWith(`${entry.id}@`)),
      ...(entry.measured ? { measured: entry.measured } : {}),
    }))
    .filter((entry) => entry.cases.length > 0)
}

/** Each role's availability over a policy's layouts, as the manifest's policy gives it. */
function roleAvailabilityOf(
  group: readonly AvailabilityCell[],
  component: ContractComponent,
): NonNullable<ManifestPolicy['roleAvailability']> {
  const roles = [
    ...new Set(
      group.flatMap((cell) => [...(cell.roles ?? []), ...(cell.rolesNotApplicable?.roles ?? [])]),
    ),
  ]
  const statusFor = (cell: AvailabilityCell, role: TextRole): LayoutStatus =>
    cell.status === 'notApplicable'
      ? { notApplicable: cell.reason ?? '' }
      : cell.rolesNotApplicable?.roles.includes(role)
        ? { notApplicable: cell.rolesNotApplicable.reason }
        : cell.verifiedRoles?.includes(role)
          ? 'verified'
          : 'pending'
  const [only] = group
  return Object.fromEntries(
    roles.map((role) => [
      role,
      component.layouts.length === 0 && only
        ? statusFor(only, role)
        : Object.fromEntries(group.map((cell) => [cell.layout ?? '', statusFor(cell, role)])),
    ]),
  )
}

/** What one component declares and offers, for its manifest entry. Undefined until it declares. */
export function componentContract(
  component: ContractComponent,
  gate: SchemaGate,
  evidence: readonly Evidence[] = EVIDENCE,
): ComponentContract | undefined {
  if (!component.declaration) return undefined
  const cells = capabilityAvailability(component, evidence, gate)
  const capabilities: ComponentContract['capabilities'] = {}
  for (const capability of CAPABILITIES.map(({ id }) => id)) {
    const own = cells.filter((cell) => cell.capability === capability)
    if (own.length > 0 && own.every((cell) => cell.scope === null)) {
      capabilities[capability] = { notApplicable: own[0]?.reason ?? '' }
      continue
    }
    const groups = new Map<string, AvailabilityCell[]>()
    for (const cell of own) {
      const key = `${cell.scope ?? ''}|${cell.part ?? ''}`
      groups.set(key, [...(groups.get(key) ?? []), cell])
    }
    const policies: ManifestPolicy[] = []
    for (const group of groups.values()) {
      const applicable = group.find((cell) => cell.policy !== 'notApplicable')
      if (!applicable?.scope) continue
      policies.push({
        policy: applicable.policy === 'required' ? 'required' : 'conditional',
        scope: applicable.scope,
        ...(applicable.part ? { part: applicable.part } : {}),
        ...(applicable.roles ? { roles: applicable.roles } : {}),
        ...(applicable.trigger
          ? {
              trigger: {
                ...applicable.trigger,
                ...(applicable.reachable === undefined ? {} : { reachable: applicable.reachable }),
              },
            }
          : {}),
        closingTask: applicable.closingTask ?? 0,
        fields: [
          ...new Set(
            evidence
              .filter(
                (entry) =>
                  isCapabilityEvidence(entry) &&
                  entry.component === component.id &&
                  entry.capability === capability &&
                  entry.scope === applicable.scope &&
                  (entry.part ?? '') === (applicable.part ?? ''),
              )
              .map((entry) => entry.field),
          ),
        ],
        availability:
          component.layouts.length === 0
            ? statusOf(applicable)
            : Object.fromEntries(group.map((cell) => [cell.layout ?? '', statusOf(cell)])),
        ...(applicable.roles ? { roleAvailability: roleAvailabilityOf(group, component) } : {}),
      })
    }
    const cases = own.flatMap((cell) => cell.evidence ?? [])
    capabilities[capability] = {
      policies,
      evidence: evidenceFor(
        evidence.filter(
          (entry): entry is CapabilityEvidence =>
            isCapabilityEvidence(entry) &&
            entry.component === component.id &&
            entry.capability === capability,
        ),
        cases,
      ),
    }
  }
  const contentSources: ComponentContract['contentSources'] = {}
  const rows = sourceAvailability(component, evidence, gate)
  for (const source of component.declaration.contentSources) {
    const own = rows.filter((row) => row.source === source)
    const first = own[0]
    if (!first) continue
    const entries = evidence.filter(
      (entry): entry is SourceEvidence =>
        'source' in entry && entry.source === source && entry.component === component.id,
    )
    contentSources[source] = {
      owner: first.owner,
      ...(first.gate ? { gate: first.gate } : {}),
      fields: [...new Set(entries.map((entry) => entry.field))],
      tests: entries.flatMap((entry) => entry.tests),
      resolvers: [
        ...new Set(
          entries.flatMap((entry) =>
            entry.resolvers.map((resolver) => `${resolver.module}#${resolver.export}`),
          ),
        ),
      ],
      availability:
        component.layouts.length === 0
          ? first.status
          : Object.fromEntries(own.map((row) => [row.layout ?? '', row.status])),
    }
  }
  return { capabilities, contentSources }
}

/** The contract's registry, the slot blocks and listings, and what the manifest does not cover. */
export function contractSummary(components: readonly ContractComponent[], gate: SchemaGate) {
  const outside = (kind: ContractComponent['kind']) =>
    components
      .filter((component) => component.kind === kind)
      .map((component) => ({
        type: component.id,
        title: component.title,
        ...componentContract(component, gate),
      }))
  return {
    registry: {
      capabilities: CAPABILITIES,
      contentSources: CONTENT_SOURCES,
      textRoles: TEXT_ROLES,
    },
    slotBlocks: outside('slotBlock'),
    listings: outside('listing'),
    views: outside('view'),
    coverage: {
      declares: ['section', 'slotBlock', 'listing', 'view'],
      declared: components.filter((component) => component.declaration).map(({ id }) => id),
      notDeclaredYet: components.filter((component) => !component.declaration).map(({ id }) => id),
      // Not sections, slot blocks or listings: nothing here says anything about these.
      notCovered: FUTURE_COVERAGE,
    },
  }
}
