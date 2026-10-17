import { colorHex } from '@/config/tokens.generated'
import {
  SECTION_OVERLAY_OPACITY,
  SECTION_OVERLAY_TITLES,
  SECTION_WASH_COLOURS,
  SECTION_WASH_TITLES,
  defaultOverlayFor,
} from '@/lib/sanity/section-style-options'

import { contrastRatio } from './contrast'
import { tonePalette } from './heading-contrast'
import { hexToRgb, rgbToHex } from './oklch'

/**
 * Whether text stays readable on a section's background picture or gradient (WCAG 2.2 AA asks for
 * 4.5:1 for body text). The text colours are the tone's, as tokens.generated.css redefines them per
 * `[data-tone]`. A picture is unknown, so it is measured at its worst: the overlay (the tone's own
 * background colour at the chosen strength) laid over a pure black and a pure white area, whichever
 * is harder to read. A gradient is measured at each of its stops. Studio shows the result as a
 * warning, never a block.
 */

export const BODY_TEXT_RATIO = 4.5

interface TextColours {
  body: string
  secondary: string
}

function textColours(tone: string | null | undefined): TextColours {
  switch (tone) {
    case 'inverse':
      return { body: colorHex.inkInverse, secondary: colorHex.inkInverseMuted }
    case 'accent':
      return { body: colorHex.accentInk, secondary: colorHex.accentInk }
    default:
      return { body: colorHex.ink, secondary: colorHex.inkMuted }
  }
}

function composite(colour: string, background: string, alpha: number): string {
  const [top, bottom] = [hexToRgb(colour), hexToRgb(background)]
  return rgbToHex(top.map((channel, i) => channel * alpha + (bottom[i] ?? 0) * (1 - alpha)))
}

export interface BackgroundProblem {
  ratio: number
  message: string
}

export interface BackgroundInput {
  tone: string | null | undefined
  hasImage: boolean
  overlay?: string | null
  /** The overlay's colour: 'background' (the default), 'light' or 'dark'. */
  wash?: string | null
  /** How much of the picture shows, 0 to 1 (1 when left out). */
  strength?: number | null
  /** The chosen gradient's colours, when one is set. */
  gradientStops?: readonly string[]
}

const pct = (ratio: number) => `${ratio.toFixed(1)}:1`

/** The weakest text/background pair, as a warning; null when every pair reaches 4.5:1 or nothing is set. */
export function backgroundContrastProblem({
  tone,
  hasImage,
  overlay,
  wash,
  strength,
  gradientStops = [],
}: BackgroundInput): BackgroundProblem | null {
  const text = textColours(tone)

  if (hasImage) {
    const level = overlay && overlay in SECTION_OVERLAY_OPACITY ? overlay : defaultOverlayFor(tone)
    const opacity = SECTION_OVERLAY_OPACITY[level as keyof typeof SECTION_OVERLAY_OPACITY]
    const { background } = tonePalette(tone)
    const washColour = wash === 'light' || wash === 'dark' ? SECTION_WASH_COLOURS[wash] : background
    // A picture below full strength lets the section's own background through before the overlay.
    const shown = typeof strength === 'number' ? Math.min(1, Math.max(0, strength)) : 1
    const worstAreas = ['#000000', '#ffffff'].map((area) =>
      composite(washColour, composite(area, background, shown), opacity),
    )
    const measures = (['body', 'secondary'] as const).map((kind) => ({
      kind,
      ratio: Math.min(...worstAreas.map((area) => contrastRatio(text[kind], area))),
    }))
    const worst = measures.reduce((a, b) => (b.ratio < a.ratio ? b : a))
    if (worst.ratio >= BODY_TEXT_RATIO) return null
    const washNote =
      wash === 'light' || wash === 'dark' ? ` (${SECTION_WASH_TITLES[wash].toLowerCase()})` : ''
    const name = SECTION_OVERLAY_TITLES[level as keyof typeof SECTION_OVERLAY_TITLES]
    return {
      ratio: worst.ratio,
      message: `${worst.kind === 'body' ? 'Text' : 'Secondary text'} may be hard to read on this picture: with the ${name.toLowerCase()} overlay${washNote}, the lightest or darkest part of a photo could drop it to ${pct(worst.ratio)} (text needs ${BODY_TEXT_RATIO}:1). Choose a stronger overlay, or a calmer picture.`,
    }
  }

  if (gradientStops.length > 0) {
    const worst = gradientStops
      .flatMap((stop) =>
        (['body', 'secondary'] as const).map((kind) => ({
          kind,
          ratio: contrastRatio(text[kind], stop),
        })),
      )
      .reduce((a, b) => (b.ratio < a.ratio ? b : a))
    if (worst.ratio >= BODY_TEXT_RATIO) return null
    return {
      ratio: worst.ratio,
      message: `${worst.kind === 'body' ? 'Text' : 'Secondary text'} may be hard to read on this gradient: one of its colours gives ${pct(worst.ratio)} (text needs ${BODY_TEXT_RATIO}:1). Pick a darker or lighter background, or change the gradient in Design → Brand colours.`,
    }
  }

  return null
}
