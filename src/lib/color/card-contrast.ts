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

/**
 * Whether text stays readable on a tinted card (README, "Link list": Card design and overrides). A
 * card's background colour and strength are layered like the rest of its design: the card's own
 * (when it is customised) over the list's, over the layout's own surface. The text is measured on the
 * colour the page draws:
 * - a solid card: the tint at its strength over the section's background;
 * - glass: the tint at its strength over the darkest and the lightest photo, whichever is worse, as
 *   the glass check does (glass-contrast.ts). A transparent glass card has nothing but the photo
 *   behind its text, so it is measured on pure black and white, and never passes on its own.
 * Studio shows the result as a warning, never a block.
 */

/** A stored theme colour, as it sits in the form or a query result. */
interface StoredColour {
  colour?: string | null
  hex?: string | null
}

/** The fields this check reads from a list's Cards box or a card's Appearance. */
export interface StoredCardSurface {
  background?: StoredColour | null
  backgroundStrength?: string | null
  label?: { colour?: StoredColour | null } | null
}

const chosen = (colour: StoredColour | null | undefined) =>
  colour?.colour && colour.colour !== 'inherit' ? colour : undefined

/** The background and label colour that apply: the card's where it chose one, else the list's. */
export function layeredCardSurface(
  list: StoredCardSurface | null | undefined,
  card: StoredCardSurface | null | undefined,
): StoredCardSurface {
  const strength = (value: string | null | undefined) =>
    SURFACE_STRENGTHS.find((option) => option === value)
  return {
    background: chosen(card?.background) ?? chosen(list?.background),
    backgroundStrength:
      strength(card?.backgroundStrength) ?? strength(list?.backgroundStrength) ?? undefined,
    label: { colour: chosen(card?.label?.colour) ?? chosen(list?.label?.colour) },
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

export interface CardContrast {
  ratio: number
  /** The background the ratio was measured on. */
  background: string
}

/**
 * The lowest contrast `foreground` (hex) gets on the card, given the section's tone and, for glass,
 * the glass's strength. Null when nothing about the card's background is chosen: the layout's own
 * surface is checked elsewhere (the theme colour field, the glass strength).
 */
export function cardTextContrast({
  foreground,
  surface,
  tone,
  glass,
  site = colorHex,
}: {
  foreground: string
  surface: StoredCardSurface
  tone: string | null | undefined
  /** The strength of the list's glass, or null for a solid card. */
  glass: GlassStrength | null
  site?: ColourSet
}): CardContrast | null {
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

/** The label's colour on the card as hex: its chosen colour, else the tone's text colour. */
export function cardLabelHex(
  surface: StoredCardSurface,
  tone: string | null | undefined,
  site: ColourSet = colorHex,
): string {
  const label = surface.label?.colour
  return (
    (label ? themeColourHex(label.colour, label.hex, tone, site) : null) ??
    tonePalette(tone, site).colors.ink
  )
}
