import { provenanceOf } from './builder-provenance'
import type { CapabilityId, SharedBuilder } from './capabilities'
import type { CapabilityException } from './capability-exceptions'

/**
 * Reading the capability markers out of schema definitions (lib/sanity/schema/capability-marker.ts),
 * and asking whether a component's schema really offers a field for a layout. Pure: the definitions
 * come in, so tests use a small in-memory schema. Paths are the design manifest's: `style.panel`,
 * `links[].design.border`, `supporting[statsBar].items`.
 */

/** A field or named type, as `defineField` and `defineType` return it. */
export interface SchemaField {
  name: string
  type: string
  title?: string
  group?: string | readonly string[]
  fields?: readonly SchemaField[]
  of?: readonly SchemaField[]
  options?: Record<string, unknown>
  hidden?: unknown
}

/** Finds a named type (sectionStyle, decorativeDivider, a slot block) by name. */
export type TypeLookup = (name: string) => SchemaField | undefined

export interface Marker {
  capability?: CapabilityId
  /** The shared builder that stamped it: never read from a typed-in option. */
  designBuilder?: SharedBuilder
  /** Why the stamp can't be trusted here (made for another field, or its capability changed). */
  forged?: string
}

/**
 * The field's marker: its capability, and the builder whose provenance stamp it carries (on its own
 * options, else its named type's). A stamp made for another field, or a capability changed after the
 * builder set it, is reported as forged and proves nothing.
 */
export function markerOf(field: SchemaField, lookup: TypeLookup): Marker {
  const named = lookup(field.type)
  const ownStamp = provenanceOf(field.options)
  const stamp = ownStamp ?? provenanceOf(named?.options)
  const capability = (field.options?.capability ?? named?.options?.capability) as
    CapabilityId | undefined
  const madeFor = ownStamp ? field.name : named?.name
  const forged = !stamp
    ? undefined
    : stamp.name !== undefined && stamp.name !== madeFor
      ? `stamped for ${stamp.name}, not ${madeFor ?? field.name}`
      : (stamp.capability ?? undefined) !== capability
        ? `its capability says ${capability ?? 'none'}, but ${stamp.builder} made it as ${stamp.capability ?? 'none'}`
        : undefined
  return {
    ...(capability ? { capability } : {}),
    ...(stamp && !forged ? { designBuilder: stamp.builder } : {}),
    ...(forged ? { forged } : {}),
  }
}

const MAX_DEPTH = 8

/** The fields inside an object field: its own, or its named type's. */
function fieldsOf(field: SchemaField, lookup: TypeLookup): readonly SchemaField[] | undefined {
  return field.fields ?? lookup(field.type)?.fields
}

/** An array field's members, each with the path segment the manifest gives it. */
function membersOf(field: SchemaField, path: string) {
  const members = field.of ?? []
  return members.map((member) => ({
    member,
    path: members.length > 1 ? `${path}[${member.type}]` : `${path}[]`,
  }))
}

export interface WalkedField {
  path: string
  field: SchemaField
  marker: Marker
  /** The top-level field it sits under. */
  top: SchemaField
}

/**
 * Every field of a type, depth first, with its manifest path. `visit` returns false to skip a field's
 * subfields (a built field is one control, however it is made inside).
 */
export function walkFields(
  type: SchemaField,
  lookup: TypeLookup,
  visit: (walked: WalkedField) => unknown,
) {
  const walk = (
    fields: readonly SchemaField[] | undefined,
    prefix: string,
    top: SchemaField | undefined,
    stack: readonly string[],
  ) => {
    if (!fields || stack.length > MAX_DEPTH) return
    // Only named types can recur (a type that holds itself); inline objects are all type `object`.
    const enter = (typeName: string) => (lookup(typeName) ? [...stack, typeName] : [...stack, ''])
    const recurs = (typeName: string) => Boolean(lookup(typeName)) && stack.includes(typeName)
    for (const field of fields) {
      const path = `${prefix}${field.name}`
      const root = top ?? field
      if (visit({ path, field, marker: markerOf(field, lookup), top: root }) === false) continue
      if (field.type === 'array') {
        for (const { member, path: memberPath } of membersOf(field, path)) {
          const memberFields = member.fields ?? lookup(member.type)?.fields
          if (memberFields && !recurs(member.type)) {
            walk(memberFields, `${memberPath}.`, root, enter(member.type))
          }
        }
        continue
      }
      if (recurs(field.type)) continue
      walk(fieldsOf(field, lookup), `${path}.`, root, enter(field.type))
    }
  }
  walk(type.fields, '', undefined, [type.name])
}

const inDesignGroup = (field: SchemaField) =>
  Array.isArray(field.group) ? field.group.includes('design') : field.group === 'design'

/** Whether an exception row lists this path, or a field this path sits inside. */
function exceptionFor(
  exceptions: readonly CapabilityException[],
  component: string,
  path: string,
): CapabilityException | undefined {
  return exceptions.find(
    (row) =>
      row.component === component &&
      row.fields.some(
        (listed) =>
          path === listed || path.startsWith(`${listed}.`) || path.startsWith(`${listed}[`),
      ),
  )
}

export interface PrivateField {
  path: string
  /** The capability marker it carries without a shared builder, if any. */
  capability?: CapabilityId
  /**
   * Why the field is private: a design control no shared builder made, a marker with no review, or a
   * builder's stamp that doesn't belong to it.
   */
  problem:
    'unbuilt' | 'unreviewedMarker' | 'markerMismatch' | 'markedNonDesign' | 'forgedProvenance'
}

/**
 * Design fields a component has that no shared builder made and no reviewed exception covers, and
 * capability markers set without a builder outside the exception register. Judged by how the field
 * was made, never by its name.
 */
export function privateFields(
  type: SchemaField,
  lookup: TypeLookup,
  exceptions: readonly CapabilityException[],
): PrivateField[] {
  const found: PrivateField[] = []
  walkFields(type, lookup, ({ path, field, marker, top }) => {
    const exception = exceptionFor(exceptions, type.name, path)
    if (marker.forged) {
      found.push({
        path,
        ...(marker.capability ? { capability: marker.capability } : {}),
        problem: 'forgedProvenance',
      })
    }
    if (marker.capability && !marker.designBuilder) {
      if (!exception) {
        found.push({ path, capability: marker.capability, problem: 'unreviewedMarker' })
      } else if (exception.nature === 'query' || exception.nature === 'contentSource') {
        found.push({ path, capability: marker.capability, problem: 'markedNonDesign' })
      } else if (exception.marked?.[path] !== marker.capability) {
        found.push({ path, capability: marker.capability, problem: 'markerMismatch' })
      }
    }
    if (marker.designBuilder) return false
    if (!inDesignGroup(top)) return true
    if (exception) return false
    const hasInside =
      field.type === 'array' ? (field.of ?? []).length > 0 : Boolean(fieldsOf(field, lookup))
    // A box of built fields is only grouping; a control with nothing inside it is what was made here.
    if (!hasInside || field.type === 'array') {
      if (!(field.type === 'array' && arrayMembersBuilt(field, lookup))) {
        found.push({ path, problem: 'unbuilt' })
      }
      return false
    }
    return true
  })
  return found
}

function arrayMembersBuilt(field: SchemaField, lookup: TypeLookup): boolean {
  const members = field.of ?? []
  return (
    members.length > 0 && members.every((member) => Boolean(markerOf(member, lookup).designBuilder))
  )
}

export interface ExceptionProblem {
  component: string
  fields: readonly string[]
  message: string
  fix: string
}

/** Rows that are incomplete, stale or name fields that don't exist. */
export function exceptionProblems(
  exceptions: readonly CapabilityException[],
  types: ReadonlyMap<string, SchemaField>,
  lookup: TypeLookup,
): ExceptionProblem[] {
  const problems: ExceptionProblem[] = []
  const seen = new Map<string, string>()
  for (const row of exceptions) {
    const problem = (message: string, fix: string) =>
      problems.push({ component: row.component, fields: row.fields, message, fix })
    const where = `${row.component}: ${row.fields.join(', ')}`
    if (!row.justification.trim()) problem(`${where} has no justification.`, 'Say why it stays.')
    if (!row.reviewer.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(row.reviewed)) {
      problem(`${where} has no reviewer and review date.`, 'Record who reviewed it, and when.')
    }
    if (row.status === 'temporary' && !row.removalTask) {
      problem(`${where} is temporary with no removal task.`, 'Name the task that removes it.')
    }
    if (row.status === 'permanent' && row.removalTask) {
      problem(
        `${where} is permanent but names a removal task.`,
        'Make it temporary, or drop the task.',
      )
    }
    if ((row.nature === 'query' || row.nature === 'contentSource') && row.marked) {
      problem(
        `${where} is a ${row.nature === 'query' ? 'query' : 'content-source'} setting with a capability marker.`,
        'A query or content-source setting is not a design capability: remove the marker.',
      )
    }
    for (const path of Object.keys(row.marked ?? {})) {
      if (!row.fields.includes(path)) {
        problem(
          `${where} marks ${path}, which the row doesn't list.`,
          'List the field, or drop the mark.',
        )
      }
    }
    const type = types.get(row.component)
    if (!type) {
      problem(`${where} names a component that doesn't exist.`, 'Remove the row.')
      continue
    }
    const walked = new Map<string, WalkedField>()
    walkFields(type, lookup, (field) => {
      walked.set(field.path, field)
    })
    for (const path of row.fields) {
      const key = `${row.component}|${path}`
      if (seen.has(key))
        problem(`${row.component}: ${path} is listed twice.`, 'Keep one row for it.')
      seen.set(key, path)
      const field = walked.get(path)
      if (!field) {
        problem(
          `${row.component}: ${path} doesn't exist.`,
          'Remove it from the exception register (lib/design/capability-exceptions.ts).',
        )
      } else if (field.marker.designBuilder) {
        problem(
          `${row.component}: ${path} is now made by ${field.marker.designBuilder}, so its exception is stale.`,
          'Remove it from the exception register.',
        )
      }
    }
  }
  return problems
}

// ---------------------------------------------------------------------------------------------------
// Whether the schema offers a field

/** One step of a manifest path: a field, or an array's member (by type, or the only one). */
interface Segment {
  name: string
  member?: string
}

export function parseFieldPath(path: string): Segment[] {
  return path.split('.').map((part) => {
    const match = /^([^[\]]+)(?:\[([^\]]*)\])?$/.exec(part)
    if (!match?.[1]) throw new Error(`"${path}" is not a manifest path.`)
    return match[2] === undefined ? { name: match[1] } : { name: match[1], member: match[2] }
  })
}

/** The fields reached along a path, or why the path doesn't exist. */
export function resolveFieldPath(
  type: SchemaField,
  path: string,
  lookup: TypeLookup,
): { field: SchemaField; marker: Marker } | { missing: string } {
  let fields: readonly SchemaField[] | undefined = type.fields
  let found: SchemaField | undefined
  for (const segment of parseFieldPath(path)) {
    found = fields?.find((field) => field.name === segment.name)
    if (!found) return { missing: `${type.name} has no field ${path}` }
    if (segment.member !== undefined) {
      const member = (found.of ?? []).find((candidate) =>
        segment.member ? candidate.type === segment.member : true,
      )
      if (!member) return { missing: `${path} has no member ${segment.member ?? ''}` }
      fields = member.fields ?? lookup(member.type)?.fields
    } else {
      fields = fieldsOf(found, lookup)
    }
  }
  if (!found) return { missing: `${type.name} has no field ${path}` }
  return { field: found, marker: markerOf(found, lookup) }
}

/** The person the Studio would show the field to: the agency, which sees every Design option. */
const AGENCY = {
  id: 'capability-check',
  roles: [{ name: 'administrator', title: 'Administrator' }],
}

type PathKey = string | { _key: string }

/**
 * Whether the Studio offers a field to the agency for this section value (its layout and state): every
 * field along the path is shown by its own `hidden` rule, or a preset the section offers sets it to
 * the value it holds. Evaluates the schema's real rules, so a rule that withholds the Panel or the
 * shared overlay on a layout withholds it here too.
 */
export function fieldOffered({
  type,
  section,
  path,
  lookup,
}: {
  type: SchemaField
  section: Readonly<Record<string, unknown>> & { _key: string; _type: string }
  path: string
  lookup: TypeLookup
}): { offered: true } | { offered: false; reason: string } {
  const document = { _id: 'drafts.capability-check', _type: 'page', pageBuilder: [section] }
  const sanityPath: PathKey[] = ['pageBuilder', { _key: section._key }]
  const presets = (type.options?.presets ?? []) as { set?: Record<string, unknown> }[]
  const setByPreset = (dotted: string, value: unknown) =>
    value !== undefined && presets.some((preset) => preset.set?.[dotted] === value)

  let fields: readonly SchemaField[] | undefined = type.fields
  let parent: Record<string, unknown> = section
  const dotted: string[] = []
  for (const segment of parseFieldPath(path)) {
    const field = fields?.find((candidate) => candidate.name === segment.name)
    if (!field) return { offered: false, reason: `${type.name} has no field ${path}` }
    const value: unknown = parent[segment.name]
    dotted.push(segment.name)
    sanityPath.push(segment.name)
    let hidden: boolean
    try {
      hidden =
        typeof field.hidden === 'function'
          ? Boolean(
              (field.hidden as (context: unknown) => unknown)({
                document,
                parent,
                value,
                currentUser: AGENCY,
                path: [...sanityPath],
              }),
            )
          : field.hidden === true
    } catch (error) {
      return {
        offered: false,
        reason: `${dotted.join('.')}'s hidden rule failed: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
    if (hidden && !setByPreset(dotted.join('.'), value)) {
      return { offered: false, reason: `${dotted.join('.')} is hidden for this layout and state` }
    }
    if (segment.member !== undefined) {
      const items: Record<string, unknown>[] = Array.isArray(value)
        ? (value as Record<string, unknown>[])
        : []
      const item: Record<string, unknown> | undefined = items.find((candidate) =>
        segment.member ? candidate._type === segment.member : true,
      )
      if (!item || typeof item._key !== 'string') {
        return { offered: false, reason: `${path}: the state has no ${segment.name} item to check` }
      }
      const member = (field.of ?? []).find((candidate) =>
        segment.member ? candidate.type === segment.member : true,
      )
      sanityPath.push({ _key: item._key })
      parent = item
      fields = member?.fields ?? (member ? lookup(member.type)?.fields : undefined)
    } else {
      parent = (value ?? {}) as Record<string, unknown>
      fields = fieldsOf(field, lookup)
    }
  }
  return { offered: true }
}

/** A client's view of the Studio: an Editor, who sees none of the agency-only fields. */
const CLIENT = {
  id: 'capability-check-client',
  roles: [{ name: 'editor', title: 'Editor' }],
}

/** What a rule may depend on: the field's own value, and its parent's. A rule hidden in all of them depends on neither. */
const PROBE_STATES: readonly { value: unknown; parent: Record<string, unknown> }[] = [
  { value: undefined, parent: {} },
  { value: [{ _key: 'probe' }], parent: { variant: 'probe' } },
  { value: { _key: 'probe' }, parent: { appearance: 'custom' } },
  { value: 'probe', parent: { variant: 'probe', appearance: 'custom' } },
]

/** Calls a field's `hidden` rule as `user` in each probe state; a rule that can't be evaluated is undefined. */
function hiddenIn(field: SchemaField, user: typeof AGENCY | typeof CLIENT): boolean[] | undefined {
  if (typeof field.hidden !== 'function') return PROBE_STATES.map(() => field.hidden === true)
  try {
    return PROBE_STATES.map(({ value, parent }) =>
      Boolean(
        (field.hidden as (context: unknown) => unknown)({
          document: {},
          parent,
          value,
          currentUser: user,
          path: [field.name],
        }),
      ),
    )
  } catch {
    return undefined
  }
}

/**
 * Whether the Studio keeps a field to the agency: its own `hidden` rule hides it from a client in
 * every state it was asked about (a field that is hidden only while empty, as a slot is, is not), and
 * shows it to the agency in at least one. A rule that can't be evaluated is not agency-only. The change
 * proposal manifest marks every row under an agency-only field as agency-only too.
 */
export function agencyOnlyField(field: SchemaField): boolean {
  const client = hiddenIn(field, CLIENT)
  const agency = hiddenIn(field, AGENCY)
  return Boolean(client?.every(Boolean) && agency?.some((hidden) => !hidden))
}

/** What the availability checks ask of the schema (capability-availability.ts). */
export interface SchemaGate {
  /** Whether the component has a schema to read (a listing has none of its own). */
  hasSchema: (component: string) => boolean
  /** The field an evidence entry probes, with its marker, or why it doesn't exist. */
  field: (component: string, path: string) => { marker: Marker } | { missing: string }
  /** Whether the component's schema offers the field in the entry's state, on a layout. */
  offered: (
    component: string,
    layout: string | null,
    path: string,
    state: Readonly<Record<string, unknown>>,
  ) => { offered: true } | { offered: false; reason: string }
}

/** The gate over real schema definitions: component types by name, and the named types they use. */
export function schemaGate(
  components: ReadonlyMap<string, SchemaField>,
  lookup: TypeLookup,
): SchemaGate {
  return {
    hasSchema: (component) => components.has(component),
    field: (component, path) => {
      const type = components.get(component)
      if (!type) return { missing: `${component} has no schema` }
      const found = resolveFieldPath(type, path, lookup)
      return 'missing' in found ? found : { marker: found.marker }
    },
    offered: (component, layout, path, state) => {
      const type = components.get(component)
      if (!type) return { offered: false, reason: `${component} has no schema to offer it` }
      return fieldOffered({
        type,
        section: {
          ...state,
          _key: 'capability-check',
          _type: component,
          ...(layout === null ? {} : { variant: layout }),
        },
        path,
        lookup,
      })
    },
  }
}
