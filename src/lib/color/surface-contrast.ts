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
  if (!surface.background && !surface.backgroundStrength) return null
  const tint = backgroundHex(surface.background ?? undefined, tone, site)
  const strength = surface.backgroundStrength as SurfaceStrength | undefined
  const fraction = strength
    ? SURFACE_STRENGTH_FRACTION[strength]
    : glass
      ? glassFractions[glass]
      : 1
  const under = glass ? ['#000000', '#ffffff'] : [tonePalette(tone, site).background]
  return under
    .map((behind) => {
      const background = tint === 'transparent' ? behind : composite(tint, behind, fraction)
      return { background, ratio: contrastRatio(foreground, background) }
    })
    .reduce((a, b) => (b.ratio < a.ratio ? b : a))
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
  tone,
  glass,
  site = colorHex,
}: {
  role: 'text' | 'background'
  current: string
  hex?: string
  inherited?: StoredSurface
  own?: StoredSurface
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
  const foreground =
    role === 'background'
      ? surfaceForegroundHex(surface, tone, site)
      : themeColourHex(current, hex, tone, site)
  if (!foreground) return null
  const result = surfaceTextContrast({ foreground, surface, tone, glass, site })
  if (!result) return null
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
