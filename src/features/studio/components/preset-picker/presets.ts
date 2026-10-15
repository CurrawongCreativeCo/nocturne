import type { PresetDefinition } from '@/lib/sanity/schema/preset-field'

export interface PresetOperation {
  type: 'set' | 'setIfMissing'
  /** Relative to the object that has the presets. */
  path: string[]
  value: unknown
}

/** 'style.tone' -> ['style', 'tone']. Empty segments ('a..b', '.a') are rejected: they are typos. */
export function splitPath(key: string): string[] {
  const path = key.split('.')
  if (path.some((segment) => segment === '')) throw new Error(`Invalid preset field path "${key}"`)
  return path
}

export function getAtPath(value: unknown, path: readonly string[]): unknown {
  let current = value
  for (const segment of path) {
    if (typeof current !== 'object' || current === null) return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

export function isEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  return (
    keysA.length === keysB.length &&
    keysA.every((key) =>
      isEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
    )
  )
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
 * The preset whose fields all hold their values now, or null ("Custom"). `defaults` stands in for a
 * field that was never set (its initial value), so a fresh section matches the preset that
 * describes its defaults.
 */
export function matchPreset<T extends Pick<PresetDefinition, 'set'>>(
  presets: readonly T[],
  value: unknown,
  defaults: Record<string, unknown> = {},
): T | null {
  return (
    presets.find((preset) =>
      Object.entries(preset.set).every(([key, expected]) => {
        const current = getAtPath(value, splitPath(key))
        return isEqual(current === undefined ? defaults[key] : current, expected)
      }),
    ) ?? null
  )
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
