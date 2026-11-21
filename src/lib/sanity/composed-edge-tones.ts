import { colorHex } from '@/config/tokens.generated'
import { relativeLuminance } from '@/lib/color/contrast'

import { sectionAtStylePath } from './schema/section-form'

/**
 * The colours the Section edge editor's preview can show for the section being edited: its own background (the
 * upper side of a cut, or the whole band of a rule) and the section that follows (what shows through the cut).
 * The editor already has the document and the field's path, so this reads the same stored `style.tone` the page
 * does. Where the document, the section or its neighbour cannot be found the caller keeps the template defaults.
 */
export interface EdgeTones {
  /** This section's background, "#rrggbb". */
  upper: string
  /** The following section's background, or the page colour when this is the last one. */
  lower: string
  /** Whether text on the upper background is light (for the centre icon). */
  upperDark: boolean
}

const TONE_HEX: Record<string, string> = {
  surface: colorHex.surface,
  alt: colorHex.surfaceAlt,
  inverse: colorHex.surfaceInverse,
  accent: colorHex.accent,
}
const toneHex = (tone: unknown): string =>
  (typeof tone === 'string' ? TONE_HEX[tone] : undefined) ?? colorHex.surface

type Segment = string | number | { _key?: string } | readonly [number | '', number | '']

export function edgeTones(
  document: unknown,
  path: readonly Segment[] | undefined,
): EdgeTones | undefined {
  const section = sectionAtStylePath(document, path) as { style?: { tone?: unknown } } | undefined
  if (!section || !path) return undefined
  const upper = toneHex(section.style?.tone)
  // The array the section sits in: the path minus the section's own segment, `style` and the field's name.
  let list: unknown = document
  for (const segment of path.slice(0, -3)) {
    if (list === null || typeof list !== 'object') return undefined
    if (typeof segment === 'string') list = (list as Record<string, unknown>)[segment]
    else return undefined
  }
  const own = path.at(-3)
  let lower: string = colorHex.surface
  if (Array.isArray(list) && own && typeof own === 'object' && '_key' in own) {
    const at = (list as { _key?: string }[]).findIndex((item) => item._key === own._key)
    const next = at >= 0 ? (list as { style?: { tone?: unknown } }[])[at + 1] : undefined
    lower = toneHex(next?.style?.tone)
  }
  return { upper, lower, upperDark: relativeLuminance(upper) < 0.4 }
}
