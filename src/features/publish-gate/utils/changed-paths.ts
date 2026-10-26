/**
 * Which paths differ between a published document and its draft, for the audit log: names only,
 * never values, so a log line holds no content. Keyed array items are named by their `_key`
 * ("pageBuilder[a1b2].heading"); anything else that differs is reported at the field.
 */
type Plain = Record<string, unknown>

const isPlain = (value: unknown): value is Plain =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function keyed(value: unknown): Map<string, unknown> | null {
  if (!Array.isArray(value)) return null
  const items = new Map<string, unknown>()
  for (const item of value) {
    if (!isPlain(item) || typeof item._key !== 'string') return null
    items.set(item._key, item)
  }
  return items
}

function same(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => same(item, b[index]))
  }
  if (isPlain(a) && isPlain(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    return [...keys].every((key) => same(a[key], b[key]))
  }
  return false
}

function walk(before: unknown, after: unknown, path: string, out: string[]) {
  if (same(before, after)) return
  if (isPlain(before) && isPlain(after)) {
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      // _id, _rev, _updatedAt, _createdAt, _type and _key are bookkeeping, not content.
      if (!key.startsWith('_')) walk(before[key], after[key], path ? `${path}.${key}` : key, out)
    }
    return
  }
  const was = keyed(before)
  const now = keyed(after)
  if (was && now) {
    const reordered = [...was.keys()].join() !== [...now.keys()].join()
    let itemChanged = false
    for (const key of new Set([...was.keys(), ...now.keys()])) {
      if (!same(was.get(key), now.get(key))) {
        itemChanged = true
        walk(was.get(key), now.get(key), `${path}[${key}]`, out)
      }
    }
    if (reordered && !itemChanged) out.push(path)
    return
  }
  out.push(path)
}

/** The paths that differ, sorted and without repeats. A missing `before` lists everything in `after`. */
export function changedPaths(before: unknown, after: unknown): string[] {
  const out: string[] = []
  walk(isPlain(before) ? before : {}, isPlain(after) ? after : {}, '', out)
  return [...new Set(out)].sort()
}
