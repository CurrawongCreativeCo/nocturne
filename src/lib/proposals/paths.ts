/**
 * The subset of Sanity's path syntax change proposals use: `field`, `.field`, `[3]`, `[-1]` and
 * `[_key=="a1"]`. Anything else (ranges, filters) is refused, so a proposal cannot reach more than it
 * names. Pure; shared by the validator and the tests.
 */

export type PathSegment =
  { kind: 'field'; name: string } | { kind: 'index'; index: number } | { kind: 'key'; key: string }

const TOKEN = /^(?:\.?([A-Za-z_][A-Za-z0-9_]*)|\[(-?\d+)\]|\[_key=="([^"\\]*)"\])/

/** The segments of `path`, or null when it isn't in the supported syntax. */
export function parsePath(path: string): PathSegment[] | null {
  const segments: PathSegment[] = []
  let rest = path
  while (rest.length > 0) {
    const match = TOKEN.exec(rest)
    if (!match) return null
    // A dot may only follow something: ".a" at the start is not a path.
    if (segments.length === 0 && rest.startsWith('.')) return null
    if (match[1] !== undefined) segments.push({ kind: 'field', name: match[1] })
    else if (match[2] !== undefined) segments.push({ kind: 'index', index: Number(match[2]) })
    else segments.push({ kind: 'key', key: match[3] ?? '' })
    rest = rest.slice(match[0].length)
  }
  return segments.length > 0 && segments[0]?.kind === 'field' ? segments : null
}

/** The path syntax for `segments`: the inverse of `parsePath`. */
export function formatPath(segments: readonly PathSegment[]): string {
  return segments
    .map((segment, index) => {
      if (segment.kind === 'field') return index === 0 ? segment.name : `.${segment.name}`
      return segment.kind === 'index' ? `[${segment.index}]` : `[_key=="${segment.key}"]`
    })
    .join('')
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** The index of the array element a segment names, or -1. */
function indexIn(array: unknown[], segment: PathSegment): number {
  if (segment.kind === 'index') {
    const index = segment.index < 0 ? array.length + segment.index : segment.index
    return index >= 0 && index < array.length ? index : -1
  }
  if (segment.kind === 'key') {
    return array.findIndex((item) => isRecord(item) && item._key === segment.key)
  }
  return -1
}

/** The value at `segments`, or undefined when nothing is there. */
export function getAt(root: unknown, segments: readonly PathSegment[]): unknown {
  let current = root
  for (const segment of segments) {
    if (segment.kind === 'field') {
      if (!isRecord(current)) return undefined
      current = current[segment.name]
    } else {
      if (!Array.isArray(current)) return undefined
      const index = indexIn(current, segment)
      if (index < 0) return undefined
      current = current[index]
    }
  }
  return current
}

/** Whether every segment but the last resolves, so a `set` on the last has somewhere to land. */
function parentOf(root: unknown, segments: readonly PathSegment[]): unknown {
  return getAt(root, segments.slice(0, -1))
}

/** Sets the value at `segments` on a copy of `document`. Throws when the parent doesn't exist. */
export function setAt<T>(document: T, segments: readonly PathSegment[], value: unknown): T {
  const copy = structuredClone(document)
  const parent = parentOf(copy, segments)
  const last = segments[segments.length - 1]
  if (!last) throw new Error('Empty path.')
  if (last.kind === 'field' && isRecord(parent)) {
    parent[last.name] = value
  } else if (Array.isArray(parent) && last.kind !== 'field') {
    const index = indexIn(parent, last)
    if (index < 0) throw new Error('No such array item.')
    parent[index] = value
  } else {
    throw new Error('The path has no parent to set on.')
  }
  return copy
}

/** Removes the value at `segments` from a copy of `document`; a missing value is not an error. */
export function unsetAt<T>(document: T, segments: readonly PathSegment[]): T {
  const copy = structuredClone(document)
  const parent = parentOf(copy, segments)
  const last = segments[segments.length - 1]
  if (!last) return copy
  if (last.kind === 'field' && isRecord(parent)) {
    Reflect.deleteProperty(parent, last.name)
  } else if (Array.isArray(parent) && last.kind !== 'field') {
    const index = indexIn(parent, last)
    if (index >= 0) parent.splice(index, 1)
  }
  return copy
}

export type InsertPosition = 'before' | 'after' | 'replace'

/** Inserts `items` next to (or in place of) the array element at `segments` on a copy of `document`. */
export function insertAt<T>(
  document: T,
  segments: readonly PathSegment[],
  position: InsertPosition,
  items: readonly unknown[],
): T {
  const copy = structuredClone(document)
  const parent = parentOf(copy, segments)
  const last = segments[segments.length - 1]
  if (!Array.isArray(parent) || !last || last.kind === 'field')
    throw new Error('Not an array position.')
  // `[-1]` on an empty array means "the end", as it does in Sanity.
  const index =
    parent.length === 0 && last.kind === 'index' && last.index < 0 ? -1 : indexIn(parent, last)
  if (index < 0 && !(parent.length === 0 && last.kind === 'index')) {
    throw new Error('No such array item.')
  }
  const at = Math.max(index, 0)
  if (position === 'replace') parent.splice(at, 1, ...items)
  else if (position === 'before') parent.splice(at, 0, ...items)
  else parent.splice(index < 0 ? 0 : at + 1, 0, ...items)
  return copy
}
