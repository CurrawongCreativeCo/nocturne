import { colorHex, glass } from '@/config/tokens.generated'

import { BODY_TEXT_RATIO, composite, textColours } from './background-contrast'
import { contrastRatio } from './contrast'

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

/** The colour the glass is made from: the tone's `--color-surface`. */
function glassColour(tone: string | null | undefined): string {
  switch (tone) {
    case 'inverse':
      return colorHex.surfaceInverse
    case 'accent':
      return colorHex.accent
    default:
      return colorHex.surface
  }
}

/** The lowest text contrast a strength gives on the tone, over the darkest or lightest photo. */
export function glassWorstRatio(tone: string | null | undefined, strength: GlassStrength): number {
  const body = textColours(tone).body
  return Math.min(
    ...['#000000', '#ffffff'].map((area) =>
      contrastRatio(body, composite(glassColour(tone), area, glass[strength])),
    ),
  )
}

export interface GlassProblem {
  ratio: number
  message: string
}

/** A warning when the strength can drop text under 4.5:1; null when it holds on any photo. */
export function glassContrastProblem({
  tone,
  strength,
}: {
  tone: string | null | undefined
  strength: string | null | undefined
}): GlassProblem | null {
  const chosen = glassStrengthOf(strength)
  const ratio = glassWorstRatio(tone, chosen)
  if (ratio >= BODY_TEXT_RATIO) return null
  const stronger = GLASS_STRENGTHS.find(
    (candidate) =>
      glass[candidate] > glass[chosen] && glassWorstRatio(tone, candidate) >= BODY_TEXT_RATIO,
  )
  return {
    ratio,
    message: `Text may be hard to read on the ${GLASS_STRENGTH_TITLES[chosen].toLowerCase()} glass: over the lightest or darkest part of a photo it could drop to ${ratio.toFixed(1)}:1 (text needs ${BODY_TEXT_RATIO}:1). ${stronger ? `Choose ${GLASS_STRENGTH_TITLES[stronger].toLowerCase()} glass, or a calmer picture.` : 'Choose a calmer picture, or a different background colour for this section.'}`,
  }
}
