import { colorHex } from '@/config/tokens.generated'
import {
  GRADIENT_STOPS,
  type GradientStop,
  type ResolvedOverlayGradient,
  type StopColourOf,
} from '@/lib/sanity/overlay-gradient'
import { SECTION_WASH_COLOURS } from '@/lib/sanity/section-style-options'

import {
  BODY_TEXT_RATIO,
  composite,
  textColours,
  type BackgroundProblem,
} from './background-contrast'
import { contrastRatio } from './contrast'
import { mixOklab, tonePalette, type ColourSet } from './heading-contrast'

/**
 * The gradient overlay in hex (lib/sanity/overlay-gradient.ts), for the Studio: its preview and
 * thumbnails draw with these, and the contrast check measures them. Same choices as the page's CSS.
 */
export const stopColourHex =
  (tone: string | null | undefined, site: ColourSet = colorHex): StopColourOf =>
  (stop) => {
    switch (stop.colour) {
      case 'background':
        return tonePalette(tone, site).background
      case 'light':
        return SECTION_WASH_COLOURS.light
      case 'dark':
        return SECTION_WASH_COLOURS.dark
      case 'accent':
        return site.accent
      case 'accent-deep':
        return mixOklab(site.accent, SECTION_WASH_COLOURS.dark, 0.45)
      case 'accent-2':
        return site.accent2
      case 'highlight':
        return site.highlight
      case 'custom':
        return stop.hex ?? '#000000'
    }
  }

const STOP_PLACE: Record<GradientStop, string> = {
  top: 'at the top',
  middle: 'in the middle',
  bottom: 'at the bottom',
}
const FOCUS_PLACE: Record<GradientStop, string> = {
  top: 'in the centre',
  middle: 'halfway out',
  bottom: 'at the edges',
}

/**
 * Whether text stays readable over the picture with the gradient on it. A picture is unknown, so as
 * for the other overlays each stop is measured over pure black and pure white (after the picture's
 * strength), and the weakest stop wins: a gradient that is barely there at the top gives the photo's
 * own contrast there, and the Studio says so rather than averaging it away. Content usually sits
 * further down than the very top, so this is a cautious warning, never a block.
 */
export function overlayGradientContrastProblem({
  tone,
  gradient,
  strength = 1,
  site = colorHex,
}: {
  tone: string | null | undefined
  gradient: ResolvedOverlayGradient
  /** How much of the picture shows, 0 to 1. */
  strength?: number
  site?: ColourSet
}): BackgroundProblem | null {
  const text = textColours(tone, site)
  const { background } = tonePalette(tone, site)
  const colourOf = stopColourHex(tone, site)
  const shown = Math.min(1, Math.max(0, strength))
  const measures = GRADIENT_STOPS.flatMap((stop) => {
    const resolved = gradient.stops[stop]
    const areas = ['#000000', '#ffffff'].map((area) =>
      composite(colourOf(resolved), composite(area, background, shown), resolved.alpha),
    )
    return (['body', 'secondary'] as const).map((kind) => ({
      stop,
      kind,
      ratio: Math.min(...areas.map((area) => contrastRatio(text[kind], area))),
    }))
  })
  const worst = measures.reduce((a, b) => (b.ratio < a.ratio ? b : a))
  if (worst.ratio >= BODY_TEXT_RATIO) return null
  const place = (gradient.shape === 'focus' ? FOCUS_PLACE : STOP_PLACE)[worst.stop]
  return {
    ratio: worst.ratio,
    message: `${worst.kind === 'body' ? 'Text' : 'Secondary text'} may be hard to read ${place} of this gradient: over the lightest or darkest part of a photo it could drop to ${worst.ratio.toFixed(1)}:1 (text needs ${BODY_TEXT_RATIO}:1). The gradient is lightest where it lets the photo show, so check the page: keep text off busy areas there, choose a stronger overlay, or raise that stop's opacity under Advanced.`,
  }
}
