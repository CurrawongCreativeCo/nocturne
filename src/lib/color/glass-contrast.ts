import { colorHex, glass } from '@/config/tokens.generated'

import { BODY_TEXT_RATIO, composite, textColours } from './background-contrast'
import { contrastRatio } from './contrast'
import type { ColourSet } from './heading-contrast'

/**
 * Whether Glass rows stay readable over a photo (WCAG 2.2 AA asks for 4.5:1). The photo behind is
 * unknown, so a strength is measured at its worst, as the section background check is: the glass (the
 * tone's surface colour at the strength's opacity, see `[data-glass]` in tokens.generated.css) laid
 * over pure black and pure white, whichever is harder to read. Title and description both use the
 * tone's body text colour. Browsers that can't blur, or visitors who ask for less transparency, get a
 * nearly solid surface, which only reads better, so it is not measured. Studio shows the result as a
 * warning, never a block.
 */

export const GLASS_STRENGTHS = ['light', 'medium', 'strong'] as const
export type GlassStrength = (typeof GLASS_STRENGTHS)[number]

/** What an unset strength draws: the middle one. */
export const DEFAULT_GLASS_STRENGTH: GlassStrength = 'medium'

export const GLASS_STRENGTH_TITLES: Record<GlassStrength, string> = {
  light: 'Light',
  medium: 'Medium',
  strong: 'Strong',
}

/** The strength drawn for a stored value; an unset or unknown one is Medium. */
export function glassStrengthOf(value: string | null | undefined): GlassStrength {
  return GLASS_STRENGTHS.find((strength) => strength === value) ?? DEFAULT_GLASS_STRENGTH
}

/**
 * The glass a Link list section draws its rows in, or null when it draws none: Glass rows are Minimal
 * (`variant` stacked, the default) with the glass row style. Mirrors `isGlassRows` in the Link list
 * schema, which a shared module cannot import.
 */
export function glassRowsStrength(
  section:
    | { variant?: string | null; rowStyle?: string | null; glassStrength?: string | null }
    | null
    | undefined,
): GlassStrength | null {
  if (section?.rowStyle !== 'glass' || (section.variant ?? 'stacked') !== 'stacked') return null
  return glassStrengthOf(section.glassStrength)
}

/** The colour the glass (and a card's own surface) is made from: the tone's `--color-surface`. */
export function toneSurfaceColour(tone: string | null | undefined, site: ColourSet): string {
  switch (tone) {
    case 'inverse':
      return site.surfaceInverse
    case 'accent':
      return site.accent
    default:
      return site.surface
  }
}

/**
 * What a row's glass looks like over the darkest and the lightest photo: the two backgrounds the
 * worst case is measured on.
 */
export function glassAreas(
  tone: string | null | undefined,
  strength: GlassStrength,
  site: ColourSet = colorHex,
): [string, string] {
  const surface = toneSurfaceColour(tone, site)
  return [
    composite(surface, '#000000', glass[strength]),
    composite(surface, '#ffffff', glass[strength]),
  ]
}

/** The harder of the two glass backgrounds for `foreground`, with the contrast it gives. */
export function glassWorstCase(
  foreground: string,
  tone: string | null | undefined,
  strength: GlassStrength,
  site: ColourSet = colorHex,
): { background: string; ratio: number } {
  const [dark, light] = glassAreas(tone, strength, site).map((background) => ({
    background,
    ratio: contrastRatio(foreground, background),
  })) as [{ background: string; ratio: number }, { background: string; ratio: number }]
  return light.ratio < dark.ratio ? light : dark
}

/** The lowest text contrast a strength gives on the tone, over the darkest or lightest photo. */
export function glassWorstRatio(
  tone: string | null | undefined,
  strength: GlassStrength,
  site: ColourSet = colorHex,
): number {
  return glassWorstCase(textColours(tone, site).body, tone, strength, site).ratio
}

export interface GlassProblem {
  ratio: number
  message: string
}

/** A warning when the strength can drop text under 4.5:1; null when it holds on any photo. */
export function glassContrastProblem({
  tone,
  strength,
  site = colorHex,
}: {
  tone: string | null | undefined
  strength: string | null | undefined
  /** The site's colours after its Brand colours; tokens.json's when left out. */
  site?: ColourSet
}): GlassProblem | null {
  const chosen = glassStrengthOf(strength)
  const ratio = glassWorstRatio(tone, chosen, site)
  if (ratio >= BODY_TEXT_RATIO) return null
  const stronger = GLASS_STRENGTHS.find(
    (candidate) =>
      glass[candidate] > glass[chosen] && glassWorstRatio(tone, candidate, site) >= BODY_TEXT_RATIO,
  )
  return {
    ratio,
    message: `Text may be hard to read on the ${GLASS_STRENGTH_TITLES[chosen].toLowerCase()} glass: over the lightest or darkest part of a photo it could drop to ${ratio.toFixed(1)}:1 (text needs ${BODY_TEXT_RATIO}:1). ${stronger ? `Choose ${GLASS_STRENGTH_TITLES[stronger].toLowerCase()} glass, or a calmer picture.` : 'Choose a calmer picture, or a different background colour for this section.'}`,
  }
}
