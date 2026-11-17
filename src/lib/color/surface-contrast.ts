import { colorHex, glass as glassFractions } from '@/config/tokens.generated'
import {
  SURFACE_STRENGTHS,
  SURFACE_STRENGTH_FRACTION,
  type SurfaceStrength,
} from '@/lib/sanity/surface-options'

import { composite } from './background-contrast'
import { contrastRatio } from './contrast'
import { toneSurfaceColour, type GlassStrength } from './glass-contrast'
import { tonePalette, type ColourSet } from './heading-contrast'
import { themeColourHex } from './theme-colour-contrast'

/** Contrast on nested solid or glass surfaces, independent of any section or item schema. */

/** A stored theme colour, as it sits in the form or a query result. */
export interface StoredColour {
  colour?: string | null
  hex?: string | null
}

/** The effective background, strength and text colour at one level of a surface. */
export interface StoredSurface {
  background?: StoredColour | null
  backgroundStrength?: string | null
  foreground?: StoredColour | null
}

const chosen = (colour: StoredColour | null | undefined) =>
  colour?.colour && colour.colour !== 'inherit' ? colour : undefined

/** Each explicit property overrides its inherited value; Inherit and unknown strengths fall through. */
export function layeredSurface(
  inherited: StoredSurface | null | undefined,
  own: StoredSurface | null | undefined,
): StoredSurface {
  const strength = (value: string | null | undefined) =>
    SURFACE_STRENGTHS.find((option) => option === value)
  return {
    background: chosen(own?.background) ?? chosen(inherited?.background),
    backgroundStrength:
      strength(own?.backgroundStrength) ?? strength(inherited?.backgroundStrength) ?? undefined,
    foreground: chosen(own?.foreground) ?? chosen(inherited?.foreground),
  }
}

/** The colour a stored background draws on `tone`, as hex; Primary is the tone's accent itself. */
function backgroundHex(
  background: StoredColour | undefined,
  tone: string | null | undefined,
  site: ColourSet,
): string {
  if (!background) return toneSurfaceColour(tone, site)
  if (background.colour === 'transparent') return 'transparent'
  if (background.colour === 'accent') return tonePalette(tone, site).colors.accent
  return (
    themeColourHex(background.colour, background.hex, tone, site) ?? toneSurfaceColour(tone, site)
  )
}

export interface SurfaceContrast {
  ratio: number
  /** The background the ratio was measured on. */
  background: string
}

/**
 * The lowest contrast `foreground` (hex) gets on the card, given the section's tone and, for glass,
 * the glass's strength. Null when nothing about the card's background is chosen: the layout's own
 * surface is checked elsewhere (the theme colour field, the glass strength).
 */
export function surfaceTextContrast({
  foreground,
  surface,
  tone,
  glass,
  site = colorHex,
}: {
  foreground: string
  surface: StoredSurface
  tone: string | null | undefined
  /** The strength of the list's glass, or null for a solid card. */
  glass: GlassStrength | null
  site?: ColourSet
}): SurfaceContrast | null {
  const backgrounds = surfaceBackgrounds({ surface, tone, glass, site })
  if (!backgrounds) return null
  return backgrounds
    .map((background) => ({ background, ratio: contrastRatio(foreground, background) }))
    .reduce((a, b) => (b.ratio < a.ratio ? b : a))
}

/**
 * The colours a chosen card background can draw as, given the section's tone and, for glass, its strength.
 * Null when nothing about the background is chosen: the family's own surface.
 */
export function surfaceBackgrounds({
  surface,
  tone,
  glass,
  site = colorHex,
}: {
  surface: StoredSurface
  tone: string | null | undefined
  glass: GlassStrength | null
  site?: ColourSet
}): string[] | null {
  if (!surface.background && !surface.backgroundStrength) return null
  const tint = backgroundHex(surface.background ?? undefined, tone, site)
  const strength = surface.backgroundStrength as SurfaceStrength | undefined
  const fraction = strength
    ? SURFACE_STRENGTH_FRACTION[strength]
    : glass
      ? glassFractions[glass]
      : 1
  const under = glass ? ['#000000', '#ffffff'] : [tonePalette(tone, site).background]
  return under.map((behind) =>
    tint === 'transparent' ? behind : composite(tint, behind, fraction),
  )
}

/** The chosen foreground, else the surrounding tone’s ink. */
export function surfaceForegroundHex(
  surface: StoredSurface,
  tone: string | null | undefined,
  site: ColourSet = colorHex,
): string {
  const label = surface.foreground
  return (
    (label ? themeColourHex(label.colour, label.hex, tone, site) : null) ??
    tonePalette(tone, site).colors.ink
  )
}

/** Evaluate a colour choice at its own level before layering it over the inherited surface. */
export function surfaceColourCheck({
  role,
  current,
  hex,
  inherited,
  own,
  foregrounds = [],
  tone,
  glass,
  site = colorHex,
}: {
  role: 'text' | 'background'
  current: string
  hex?: string
  inherited?: StoredSurface
  own?: StoredSurface
  /** Every other chosen text colour on the card: a background is judged by the worst of them. */
  foregrounds?: readonly StoredColour[]
  tone?: string
  glass: GlassStrength | null
  site?: ColourSet
}) {
  const choice = { colour: current, hex }
  const put = (level: StoredSurface | undefined): StoredSurface =>
    role === 'background' ? { ...level, background: choice } : (level ?? {})
  const surface = own
    ? layeredSurface(inherited, put(own))
    : layeredSurface(put(inherited), undefined)
  const candidates =
    role === 'background'
      ? [
          surfaceForegroundHex(surface, tone, site),
          ...foregrounds.map((colour) => themeColourHex(colour.colour, colour.hex, tone, site)),
        ]
      : [themeColourHex(current, hex, tone, site)]
  const measured = candidates
    .filter((foreground): foreground is string => Boolean(foreground))
    .map((foreground) => ({
      foreground,
      result: surfaceTextContrast({ foreground, surface, tone, glass, site }),
    }))
    .filter((entry): entry is typeof entry & { result: SurfaceContrast } => entry.result !== null)
  if (measured.length === 0) return null
  const { foreground, result } = measured.reduce((a, b) =>
    b.result.ratio < a.result.ratio ? b : a,
  )
  const required = 4.5
  return {
    foreground,
    background: result.background,
    ratio: result.ratio,
    required,
    pass: result.ratio >= required,
    suggestion: null,
  }
}
