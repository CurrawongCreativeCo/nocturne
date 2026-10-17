import type { Path } from 'sanity'

/** A Studio field path: field names, array positions and `{ _key }` array members. */
export type FieldPath = Path

/** The value at `path` in a document, or undefined if any step is missing. */
export function valueAtPath(document: unknown, path: FieldPath): unknown {
  let current: unknown = document
  for (const step of path) {
    if (current === null || typeof current !== 'object') return undefined
    if (typeof step === 'string') {
      current = (current as Record<string, unknown>)[step]
    } else if (typeof step === 'number') {
      current = (current as unknown[])[step]
    } else if (!Array.isArray(step) && '_key' in step) {
      current = Array.isArray(current)
        ? (current as { _key?: string }[]).find((member) => member._key === step._key)
        : undefined
    } else {
      return undefined
    }
  }
  return current
}

/**
 * The object that holds the array a field sits in: for a link's field, the Link list section. A
 * field inside an array member can't see past its own item (`parent`), so choices that depend on the
 * section's layout read it through the document and the path.
 */
export function enclosingOfArray(
  document: unknown,
  path: FieldPath,
  arrayName: string,
): Record<string, unknown> | undefined {
  const index = path.lastIndexOf(arrayName)
  if (index < 0) return undefined
  const found = valueAtPath(document, path.slice(0, index))
  return found && typeof found === 'object' ? (found as Record<string, unknown>) : undefined
}
