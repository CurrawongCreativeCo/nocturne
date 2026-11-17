import type { Patch } from './capability-evidence'

/** Applying an evidence entry's stored values (capability-evidence.ts). Pure, for checks and tests. */

type Container = Record<string, unknown> | unknown[]

/**
 * A copy of `value` with the patch applied: each dotted path (`links.0.design.border`) set, creating
 * objects and lists on the way, and `null` removing the value (unset).
 */
export function applyPatch<T extends Record<string, unknown>>(value: T, patch: Patch = {}): T {
  const result = structuredClone(value)
  for (const [path, next] of Object.entries(patch)) {
    const keys = path.split('.')
    let parent: Container = result
    for (const [index, key] of keys.slice(0, -1).entries()) {
      const nextKey = keys[index + 1] ?? ''
      const holder = parent as Record<string, unknown>
      const current = holder[key]
      if (current === null || typeof current !== 'object') {
        holder[key] = /^\d+$/.test(nextKey) ? [] : {}
      }
      parent = holder[key] as Container
    }
    const last = keys.at(-1) ?? ''
    if (next === null) {
      if (Array.isArray(parent)) parent.splice(Number(last), 1)
      else Reflect.deleteProperty(parent, last)
    } else {
      const holder = parent as Record<string, unknown>
      holder[last] = structuredClone(next)
    }
  }
  return result
}

/** The value with every `$picture` reference pointing at a real fixture asset. */
export function withPicture<T>(value: T, assetId: string): T {
  if (Array.isArray(value)) return value.map((item: unknown) => withPicture(item, assetId)) as T
  if (value === null || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      key === '_ref' && item === '$picture' ? assetId : withPicture(item, assetId),
    ]),
  ) as T
}
