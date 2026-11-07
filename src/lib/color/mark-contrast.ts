import { colorHex } from '@/config/tokens.generated'

import { BODY_TEXT_RATIO, composite } from './background-contrast'
import { chosenTextColours, type StoredCardLevel } from './card-contrast'
import { contrastRatio } from './contrast'
import { toneSurfaceColour, type GlassStrength } from './glass-contrast'
import { tonePalette, type ColourSet } from './heading-contrast'
import {
  layeredSurface,
  surfaceBackgrounds,
  type StoredColour,
  type StoredSurface,
} from './surface-contrast'
import { themeColourHex } from './theme-colour-contrast'

/**
 * A decorative mark never lowers text contrast (task 156). The text is measured against its surface with
 * the mark composited over it, and a combination that fails lowers the mark's opacity when it is drawn:
 * never an error, and the mark goes altogether if no opacity is safe. Text already below the target on
 * its surface alone (a photo, a custom colour) isn't the mark's doing: it may not get any worse.
 */

const STEP = 0.005

export function safeMarkOpacity({
  opacity,
  marks,
  surfaces,
  foregrounds,
  required = BODY_TEXT_RATIO,
}: {
  /** The opacity asked for, 0 to 1. */
  opacity: number
  /** The colours the mark may draw in. */
  marks: readonly string[]
  /** What the text may sit on, without the mark. */
  surfaces: readonly string[]
  foregrounds: readonly string[]
  required?: number
}): number {
  const holds = (at: number) =>
    surfaces.every((surface) =>
      foregrounds.every((foreground) => {
        const target = Math.min(required, contrastRatio(foreground, surface))
        return marks.every(
          (mark) => contrastRatio(foreground, composite(mark, surface, at)) >= target,
        )
      }),
    )
  for (let steps = Math.round(opacity / STEP); steps > 0; steps -= 1) {
    const at = steps * STEP
    if (holds(at)) return Math.round(at * 1000) / 1000
  }
  return 0
}

const ANY_PICTURE = ['#000000', '#ffffff']

/** Which of the site's colours a card's own fill and its text are, by name. */
export interface MarkFill {
  background: keyof ColourSet
  foreground: keyof ColourSet
}

/** The mark's safe opacity where it is drawn. The site's and the Studio's one decision. */
export function markOpacityAt({
  opacity,
  colour,
  ownColours = false,
  tone,
  levels,
  backdrop = false,
  glass = null,
  fill,
  site = colorHex,
}: {
  opacity: number
  /** The stored colour; unset is the text colour. */
  colour?: StoredColour | null
  /** A picture keeping its own colours: anything from black to white. */
  ownColours?: boolean
  tone: string | null | undefined
  /** A card's stored levels, least specific first. None is the section itself. */
  levels?: readonly (StoredCardLevel | null | undefined)[]
  /** A picture, gradient or panel sits behind the text, which this can't measure exactly. */
  backdrop?: boolean
  glass?: GlassStrength | null
  /**
   * The colours a card draws on its own when no background is chosen, for a card that isn't the tone's
   * surface (a Link list's filled button): the mark and the text are measured on them instead.
   */
  fill?: MarkFill
  site?: ColourSet
}): number {
  const ink = themeColourHex('ink', null, tone, site) ?? tonePalette(tone, site).colors.ink
  const muted = themeColourHex('muted', null, tone, site) ?? ink
  const surface = (levels ?? []).reduce<StoredSurface>(
    (under, level) => layeredSurface(under, level),
    {},
  )
  const onCard = levels !== undefined
  const chosenBackground = onCard ? surfaceBackgrounds({ surface, tone, glass, site }) : null
  const ownFill = fill && !chosenBackground ? fill : undefined
  const surfaces = [
    ...(ownFill
      ? [site[ownFill.background]]
      : onCard
        ? (chosenBackground ?? [toneSurfaceColour(tone, site)])
        : [tonePalette(tone, site).background]),
    ...(backdrop ? ANY_PICTURE : []),
  ]
  const chosen = chosenTextColours(...(levels ?? []))
    .map((choice) => themeColourHex(choice.colour, choice.hex, tone, site))
    .filter((hex): hex is string => Boolean(hex))
  const text = ownFill ? site[ownFill.foreground] : ink
  const marks = ownColours
    ? ANY_PICTURE
    : [(colour ? themeColourHex(colour.colour, colour.hex, tone, site) : null) ?? text]
  return safeMarkOpacity({
    opacity,
    marks,
    surfaces,
    foregrounds: ownFill ? [text, ...chosen] : [ink, muted, ...chosen],
  })
}
