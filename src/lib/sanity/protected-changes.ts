/**
 * Pure diff behind the agency publish review: which fields outside the client-editable registry
 * (src/lib/sanity/client-editable.ts) differ between a draft and its published version. A
 * Contributor's draft can carry a design change they should never have been able to make (the
 * Studio hides those fields, but only the server decides who can write them), so an agency Publish
 * lists these before releasing the draft. No Studio imports, so it can be unit tested.
 */
import { AGENCY_ONLY_TYPES, CLIENT_EDITABLE_FIELDS } from './client-editable'

/** One protected field that differs. `path` names the field from the document down, e.g. ['pageBuilder', 'hero', 'style']. */
export interface ProtectedChange {
  path: string[]
}

/**
 * A protected change with what the publish gate needs to judge it: the typed object that holds the
 * field, the field's name and new value, and whether that object is new (absent from the published
 * version). `field` is unset when a whole agency-only object inside a page is the change.
 */
export interface ProtectedChangeDetail extends ProtectedChange {
  owner: string
  field?: string
  value: unknown
  isNew: boolean
}

type Json = unknown
type Plain = Record<string, Json>

const isPlain = (value: Json): value is Plain =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function sameValue(a: Json, b: Json): boolean {
  if (a === b) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => sameValue(item, b[index]))
  }
  if (isPlain(a) && isPlain(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    return [...keys].every((key) => sameValue(a[key], b[key]))
  }
  return false
}

/** A value that is not there: unset, null or an empty array/object counts as the same as missing. */
const isEmpty = (value: Json) =>
  value === undefined ||
  value === null ||
  (Array.isArray(value) && value.length === 0) ||
  (isPlain(value) && Object.keys(value).length === 0)

const protectedDiffers = (a: Json, b: Json) => !(isEmpty(a) && isEmpty(b)) && !sameValue(a, b)

function keyedItems(value: Json): Map<string, Plain> | null {
  if (!Array.isArray(value)) return null
  const map = new Map<string, Plain>()
  for (const item of value) {
    if (!isPlain(item) || typeof item._key !== 'string') return null
    map.set(item._key, item)
  }
  return map
}

function diffObject(
  type: string,
  published: Plain,
  draft: Plain,
  path: string[],
  out: ProtectedChangeDetail[],
) {
  const isNew = Object.keys(published).length === 0
  if (AGENCY_ONLY_TYPES.has(type)) {
    // A whole document of an agency-only type lists its fields; one inside a page is a single change.
    if (path.length > 0) {
      if (protectedDiffers(published, draft)) out.push({ path, owner: type, value: draft, isNew })
      return
    }
    for (const field of new Set([...Object.keys(published), ...Object.keys(draft)])) {
      if (!field.startsWith('_') && protectedDiffers(published[field], draft[field])) {
        out.push({ path: [field], owner: type, field, value: draft[field], isNew })
      }
    }
    return
  }
  const registry = CLIENT_EDITABLE_FIELDS[type]
  const fields = new Set([...Object.keys(published), ...Object.keys(draft)])
  for (const field of fields) {
    // _id, _rev, _updatedAt, _type and _key are bookkeeping, not content.
    if (field.startsWith('_')) continue
    const before = published[field]
    const after = draft[field]
    if (registry?.editable.includes(field)) diffValue(before, after, [...path, field], out)
    else if (protectedDiffers(before, after)) {
      out.push({ path: [...path, field], owner: type, field, value: after, isNew })
    }
  }
}

/** Looks inside an editable value for protected fields on the typed objects it holds. */
function diffValue(published: Json, draft: Json, path: string[], out: ProtectedChangeDetail[]) {
  if (sameValue(published, draft)) return
  const drafted = keyedItems(draft)
  if (drafted) {
    const before = keyedItems(published) ?? new Map<string, Plain>()
    for (const [key, item] of drafted) {
      // The section's type names it in the path ("Page builder › Hero › Style").
      const named = typeof item._type === 'string' ? [...path, item._type] : path
      diffValue(before.get(key), item, named, out)
    }
    return
  }
  if (!isPlain(draft)) return
  const before = isPlain(published) ? published : {}
  const type = typeof draft._type === 'string' ? draft._type : undefined
  if (type && (CLIENT_EDITABLE_FIELDS[type] || AGENCY_ONLY_TYPES.has(type))) {
    diffObject(type, before, draft, path, out)
    return
  }
  // An untyped or unregistered object (an image, a slug, a block): it follows the field it sits in,
  // but typed objects inside it (a link annotation) are still checked.
  for (const field of Object.keys(draft)) {
    if (!field.startsWith('_')) diffValue(before[field], draft[field], path, out)
  }
}

/**
 * Protected fields that differ between `published` and `draft` of a document of `type`, with the
 * detail the publish gate judges them by. Fields outside the allowlist count as protected,
 * including fields nobody has classified yet. A field on a section a client removed is not
 * reported (removing a section is their content), and neither is reordering. With no published
 * version every protected field that has a value is reported.
 */
export function diffProtectedDetails(
  type: string,
  published: unknown,
  draft: unknown,
): ProtectedChangeDetail[] {
  if (!isPlain(draft)) return []
  const out: ProtectedChangeDetail[] = []
  diffObject(type, isPlain(published) ? published : {}, draft, [], out)
  return out
}

/** The paths of the protected fields that differ (see `diffProtectedDetails`). */
export function diffProtectedFields(
  type: string,
  published: unknown,
  draft: unknown,
): ProtectedChange[] {
  return diffProtectedDetails(type, published, draft).map(({ path }) => ({ path }))
}

/** "pageBuilder" -> "Page builder". */
export function humaniseFieldName(name: string): string {
  const words = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** A change as a reader sees it: "Page builder › Hero › Style". */
export function describeChange(change: ProtectedChange): string {
  return change.path.map(humaniseFieldName).join(' › ')
}

/** A stable key for a change, for matching it to who made it. */
export const changeKey = (change: ProtectedChange) => change.path.join('.')
