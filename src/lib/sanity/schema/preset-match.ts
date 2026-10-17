import type { PresetDefinition } from './preset-field'

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
