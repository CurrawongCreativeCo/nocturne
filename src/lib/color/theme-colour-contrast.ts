import { colorHex } from '@/config/tokens.generated'
import type { ThemeColour } from '@/lib/sanity/theme-colour'

import { adjustLightnessForContrast, contrastRatio } from './contrast'
import { tonePalette } from './heading-contrast'
import { validColour } from './heading-gradient'

/**
 * How readable an element's chosen colour (lib/sanity/theme-colour.ts) is on its section's tone,
 * resolved the way the page draws it: the tone redefines `ink`, `ink-muted` and `accent`
 * (tokens.generated.css), so Primary on a dark tone is the lighter mix the page shows. Text needs
 * 4.5:1 (WCAG 1.4.3), icons and other graphics 3:1 (1.4.11). The page's own background is measured;
 * a background picture or glass is not, so the Studio says so where they apply.
 */

export type ColourUsage = 'text' | 'graphic'

export const USAGE_RATIO: Record<ColourUsage, number> = { text: 4.5, graphic: 3 }

/** The hex an element draws in for `colour` on `tone`, or null for Inherit and an invalid Custom. */
export function themeColourHex(
  colour: string | null | undefined,
  hex: string | null | undefined,
  tone: string | null | undefined,
): string | null {
  const { colors } = tonePalette(tone)
  switch (colour as ThemeColour | undefined) {
    case 'ink':
      return colors.ink
    case 'muted':
      return tone === 'inverse'
        ? colorHex.inkInverseMuted
        : tone === 'accent'
          ? colorHex.accentInk
          : colorHex.inkMuted
    case 'accent':
      // `accent-text` follows `accent` on the dark tones (tokens.generated.css).
      return tone === 'inverse' || tone === 'accent' ? colors.accent : colorHex.accentText
    case 'accent-2':
      return colorHex.accent2
    case 'highlight':
      return colorHex.highlight
    case 'custom':
      return validColour(hex)
    default:
      return null
  }
}

export interface ThemeColourCheck {
  foreground: string
  background: string
  ratio: number
  required: number
  pass: boolean
  /** The nearest shade that passes, for a Custom colour that does not. */
  suggestion: string | null
}

/** The contrast of an element's colour on its section's background; null when there is nothing to measure. */
export function themeColourContrast(
  colour: string | null | undefined,
  hex: string | null | undefined,
  tone: string | null | undefined,
  usage: ColourUsage,
): ThemeColourCheck | null {
  const foreground = themeColourHex(colour, hex, tone)
  if (!foreground) return null
  const { background } = tonePalette(tone)
  const required = USAGE_RATIO[usage]
  const ratio = contrastRatio(foreground, background)
  const pass = ratio >= required
  const adjusted =
    !pass && colour === 'custom'
      ? adjustLightnessForContrast(foreground, background, required)
      : null
  return {
    foreground,
    background,
    ratio,
    required,
    pass,
    suggestion: adjusted?.adjusted ? adjusted.hex : null,
  }
}
