import type { PresetDefinition } from '@/lib/sanity/schema/preset-field'
import { getAtPath, isEqual, splitPath } from '@/lib/sanity/schema/preset-match'

export interface PresetOperation {
  type: 'set' | 'setIfMissing'
  /** Relative to the object that has the presets. */
  path: string[]
  value: unknown
}

interface BuildOptions {
  /** The `_type` for an object that has to be created on the way down (path -> schema type name). */
  typeAt?: (path: readonly string[]) => string | undefined
}

/**
 * The operations that apply a preset to the object's current value: a `setIfMissing` for each parent
 * object that doesn't exist yet (so setting `style.tone` works on a section with no style), then one
 * `set` per field. Fields that already hold the preset's value are left alone, so applying a preset
 * twice changes nothing.
 */
export function buildPresetOperations(
  preset: Pick<PresetDefinition, 'set'>,
  value: unknown,
  { typeAt }: BuildOptions = {},
): PresetOperation[] {
  const parents: PresetOperation[] = []
  const sets: PresetOperation[] = []
  const created = new Set<string>()

  for (const [key, next] of Object.entries(preset.set)) {
    const path = splitPath(key)
    for (let depth = 1; depth < path.length; depth += 1) {
      const parent = path.slice(0, depth)
      const id = parent.join('.')
      if (created.has(id) || getAtPath(value, parent) !== undefined) continue
      created.add(id)
      const type = typeAt?.(parent)
      parents.push({ type: 'setIfMissing', path: parent, value: type ? { _type: type } : {} })
    }
    if (!isEqual(getAtPath(value, path), next)) sets.push({ type: 'set', path, value: next })
  }
  return [...parents, ...sets]
}

/**
 * Where keyboard focus goes inside a radio group. Arrows move between options and wrap round; Home
 * and End jump to the ends. Returns null for any other key. Selecting is left to Enter and Space.
 */
export function nextFocusIndex(key: string, index: number, count: number): number | null {
  if (count === 0) return null
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (index + 1) % count
    case 'ArrowLeft':
    case 'ArrowUp':
      return (index - 1 + count) % count
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return null
  }
}
