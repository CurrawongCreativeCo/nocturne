import { GALLERY_PATH } from '@/config/paths'

/** The widths the style guide previews sections at: a phone, a tablet and a laptop. */
export const PREVIEW_WIDTHS = [375, 768, 1280] as const
export type PreviewWidth = (typeof PREVIEW_WIDTHS)[number]

/**
 * What a reviewer has chosen, kept in the URL so a view can be shared and the page stays a plain
 * server render: `?width=375&tone.<key>=inverse&layout.<key>=split`. Nothing here is stored.
 */
export interface StyleguideState {
  width: PreviewWidth | null
  /** Tone per section, by the section's `_key`. */
  tones: Readonly<Record<string, string>>
  /** Layout per section, by the section's `_key`. */
  layouts: Readonly<Record<string, string>>
}

export const EMPTY_STATE: StyleguideState = { width: null, tones: {}, layouts: {} }

const TONE_PREFIX = 'tone.'
const LAYOUT_PREFIX = 'layout.'

type SearchParams = Record<string, string | string[] | undefined>

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/** Reads the state from a page's `searchParams`. Values are checked later against what each section offers. */
export function parseState(params: SearchParams): StyleguideState {
  const width = Number(first(params.width))
  const tones: Record<string, string> = {}
  const layouts: Record<string, string> = {}
  for (const [name, raw] of Object.entries(params)) {
    const value = first(raw)
    if (!value) continue
    if (name.startsWith(TONE_PREFIX)) tones[name.slice(TONE_PREFIX.length)] = value
    else if (name.startsWith(LAYOUT_PREFIX)) layouts[name.slice(LAYOUT_PREFIX.length)] = value
  }
  return {
    width: PREVIEW_WIDTHS.find((option) => option === width) ?? null,
    tones,
    layouts,
  }
}

/** A path (with query) for a state. The default state is the bare path. */
export function stateHref(state: StyleguideState, path: string = GALLERY_PATH): string {
  const query = new URLSearchParams()
  if (state.width) query.set('width', String(state.width))
  for (const [key, tone] of Object.entries(state.tones)) query.set(`${TONE_PREFIX}${key}`, tone)
  for (const [key, layout] of Object.entries(state.layouts)) {
    query.set(`${LAYOUT_PREFIX}${key}`, layout)
  }
  const text = query.toString()
  return text ? `${path}?${text}` : path
}

const without = (record: Readonly<Record<string, string>>, key: string) =>
  Object.fromEntries(Object.entries(record).filter(([name]) => name !== key))

export const withWidth = (state: StyleguideState, width: PreviewWidth | null): StyleguideState => ({
  ...state,
  width,
})

/** `null` goes back to what the section's content says. */
export const withTone = (
  state: StyleguideState,
  key: string,
  tone: string | null,
): StyleguideState => ({
  ...state,
  tones: tone ? { ...state.tones, [key]: tone } : without(state.tones, key),
})

export const withLayout = (
  state: StyleguideState,
  key: string,
  layout: string | null,
): StyleguideState => ({
  ...state,
  layouts: layout ? { ...state.layouts, [key]: layout } : without(state.layouts, key),
})

/** Whether anything differs from the section content as authored. */
export const isCustomised = (state: StyleguideState) =>
  state.width !== null ||
  Object.keys(state.tones).length > 0 ||
  Object.keys(state.layouts).length > 0
