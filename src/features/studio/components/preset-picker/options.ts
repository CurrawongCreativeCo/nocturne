import type {
  PresetDefinition,
  PresetOption,
  PresetThumbnail,
} from '@/lib/sanity/schema/preset-field'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/** A component: a function, or a memo/forwardRef wrapper (an object tagged with `$$typeof`). */
const isComponent = (value: unknown) =>
  typeof value === 'function' || (isRecord(value) && '$$typeof' in value)

function normaliseThumbnail(value: unknown): PresetThumbnail | undefined {
  if (typeof value === 'string') return value.trim() === '' ? undefined : value
  return isComponent(value) ? (value as PresetThumbnail) : undefined
}

const text = (value: unknown) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined

/**
 * Turns a field's `options.list` into picker options. Entries without a string value are dropped,
 * a repeated value keeps its first entry, a missing title falls back to the value, and a bare string
 * is an option titled by itself (Sanity allows `list: ['a', 'b']`).
 */
export function normalisePresetOptions(list: unknown): PresetOption[] {
  if (!Array.isArray(list)) return []
  const seen = new Set<string>()
  const options: PresetOption[] = []
  for (const entry of list as unknown[]) {
    const raw = typeof entry === 'string' ? { value: entry } : entry
    if (!isRecord(raw) || typeof raw.value !== 'string' || raw.value === '') continue
    if (seen.has(raw.value)) continue
    seen.add(raw.value)
    options.push({
      value: raw.value,
      title: text(raw.title) ?? raw.value,
      description: text(raw.description),
      thumbnail: normaliseThumbnail(raw.thumbnail),
    })
  }
  return options
}

/** Same rules for an object's `options.presets`; a preset without any fields to set is dropped. */
export function normalisePresets(list: unknown): PresetDefinition[] {
  if (!Array.isArray(list)) return []
  return normalisePresetOptions(list).flatMap((option) => {
    const source = (list as unknown[]).find(
      (entry) => isRecord(entry) && entry.value === option.value,
    ) as Record<string, unknown>
    const set = isRecord(source.set) && !Array.isArray(source.set) ? source.set : {}
    return Object.keys(set).length > 0 ? [{ ...option, set }] : []
  })
}

/**
 * The options to show when the field offers only some of them. `visible` undefined offers all; the
 * stored value is always kept, so a choice that no longer fits still shows (with its warning).
 */
export function filterVisibleOptions(
  options: PresetOption[],
  visible: readonly string[] | undefined,
  current: string | null | undefined,
): PresetOption[] {
  if (!visible) return options
  return options.filter((option) => option.value === current || visible.includes(option.value))
}
