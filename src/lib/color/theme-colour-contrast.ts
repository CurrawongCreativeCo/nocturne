import { colorHex } from '@/config/tokens.generated'
import type { ThemeColour } from '@/lib/sanity/theme-colour'

import { adjustLightnessForContrast, contrastRatio } from './contrast'
import { glassWorstCase, type GlassStrength } from './glass-contrast'
import { tonePalette, type ColourSet } from './heading-contrast'
import { validColour } from './heading-gradient'

/**
 * How readable an element's chosen colour (lib/sanity/theme-colour.ts) is on its section's tone,
 * resolved the way the page draws it: the tone redefines `ink`, `ink-muted` and `accent`
 * (tokens.generated.css), so Primary on a dark tone is the lighter mix the page shows. Text needs
 * 4.5:1 (WCAG 1.4.3), icons and other graphics 3:1 (1.4.11). The colours are the site's, after its
 * Brand colours (`ColourSet`, from `resolveDesignTokens`), not tokens.json's; tokens.json's are only
 * the fallback. The page's own background is measured, and an element on Glass rows is measured on the
 * glass at its worst (glass-contrast.ts). A background picture is not, so the Studio says so.
 */

export type ColourUsage = 'text' | 'graphic'

export const USAGE_RATIO: Record<ColourUsage, number> = { text: 4.5, graphic: 3 }

/** The hex an element draws in for `colour` on `tone`, or null for Inherit and an invalid Custom. */
export function themeColourHex(
  colour: string | null | undefined,
  hex: string | null | undefined,
  tone: string | null | undefined,
  site: ColourSet = colorHex,
): string | null {
  const { colors } = tonePalette(tone, site)
  switch (colour as ThemeColour | undefined) {
    case 'ink':
      return colors.ink
    case 'muted':
      return tone === 'inverse'
        ? site.inkInverseMuted
        : tone === 'accent'
          ? site.accentInk
          : site.inkMuted
    case 'accent':
      // `accent-text` follows `accent` on the dark tones (tokens.generated.css).
      return tone === 'inverse' || tone === 'accent' ? colors.accent : site.accentText
    case 'accent-2':
      return site.accent2
    case 'highlight':
      return site.highlight
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

export interface ThemeColourContext {
  /** The site's colours after its Brand colours; tokens.json's when left out. */
  site?: ColourSet
  /** The element sits on Glass rows of this strength: measure on the glass, over the worst photo. */
  glass?: GlassStrength | null
}

/** The contrast of an element's colour on its section's background; null when there is nothing to measure. */
export function themeColourContrast(
  colour: string | null | undefined,
  hex: string | null | undefined,
  tone: string | null | undefined,
  usage: ColourUsage,
  { site = colorHex, glass }: ThemeColourContext = {},
): ThemeColourCheck | null {
  const foreground = themeColourHex(colour, hex, tone, site)
  if (!foreground) return null
  const required = USAGE_RATIO[usage]
  const { background, ratio } = glass
    ? glassWorstCase(foreground, tone, glass, site)
    : (() => {
        const { background } = tonePalette(tone, site)
        return { background, ratio: contrastRatio(foreground, background) }
      })()
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
