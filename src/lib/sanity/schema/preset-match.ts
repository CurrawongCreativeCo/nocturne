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

export interface PresetState<T> {
  /** The preset every field matches, or null (Custom). */
  preset: T | null
  /** The preset with the fewest fields that differ: the preset itself while matched, else what Custom started from. */
  nearest: T | null
  /** The nearest preset's fields that hold something else now (empty while matched). */
  differences: string[]
}

/**
 * Which preset a value is on, and when it is Custom, which one it is closest to and which fields
 * moved. `defaults` stands in for unset fields as in `matchPreset`. Fewest moved fields wins, then the
 * most fields still matching (so a preset that sets more of what the value holds), then the earlier preset.
 */
export function describePresetState<T extends Pick<PresetDefinition, 'set'>>(
  presets: readonly T[],
  value: unknown,
  defaults: Record<string, unknown> = {},
): PresetState<T> {
  let nearest: T | null = null
  let differences: string[] = []
  let matching = 0
  for (const preset of presets) {
    const moved = Object.entries(preset.set)
      .filter(([key, expected]) => {
        const current = getAtPath(value, splitPath(key))
        return !isEqual(current === undefined ? defaults[key] : current, expected)
      })
      .map(([key]) => key)
    const same = Object.keys(preset.set).length - moved.length
    if (
      nearest === null ||
      moved.length < differences.length ||
      (moved.length === differences.length && same > matching)
    ) {
      nearest = preset
      differences = moved
      matching = same
    }
  }
  return { preset: differences.length === 0 ? nearest : null, nearest, differences }
}

/**
 * "Full background image" while a preset matches, otherwise "Custom · based on Split, image right ·
 * 1 change (tone)". `labels` names a field path for people ("style.tone" → "tone"); without one
 * the path is shown.
 */
export function presetStateText<T extends Pick<PresetDefinition, 'set' | 'title'>>(
  state: PresetState<T>,
  labels: Record<string, string> = {},
): string {
  if (state.preset) return state.preset.title
  if (!state.nearest) return 'Custom'
  const names = state.differences.map((key) => labels[key] ?? key).join(', ')
  const count = state.differences.length
  return `Custom · based on ${state.nearest.title} · ${String(count)} ${count === 1 ? 'change' : 'changes'} (${names})`
}
