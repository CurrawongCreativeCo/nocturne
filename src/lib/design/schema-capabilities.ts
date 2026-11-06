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
  designBuilder?: SharedBuilder
}

const MAX_DEPTH = 8

/** The field's own marker, else the named type's. */
export function markerOf(field: SchemaField, lookup: TypeLookup): Marker {
  const own = field.options ?? {}
  const named = lookup(field.type)?.options ?? {}
  const capability = (own.capability ?? named.capability) as CapabilityId | undefined
  const designBuilder = (own.designBuilder ?? named.designBuilder) as SharedBuilder | undefined
  return {
    ...(capability ? { capability } : {}),
    ...(designBuilder ? { designBuilder } : {}),
  }
}

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
  /** Why the field is private: a design control no shared builder made, or a marker with no review. */
  problem: 'unbuilt' | 'unreviewedMarker' | 'markerMismatch' | 'markedNonDesign'
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

/** What the availability checks ask of the schema (capability-availability.ts). */
export interface SchemaGate {
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
