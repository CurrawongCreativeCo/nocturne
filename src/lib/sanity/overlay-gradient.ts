import { stegaClean } from 'next-sanity'

import { validColour } from '@/lib/color/heading-gradient'

import { SECTION_WASH_COLOURS } from './section-style-options'

/**
 * The gradient overlay (README, "Section backgrounds": Overlay colour › Gradient): a see-through,
 * multi-stop gradient laid between a background picture and the content, so a photo can stay bright
 * at the top and deepen behind the links lower down. It is drawn on the overlay layer the other
 * overlay colours use (components/ui/section-background.tsx), so it sits above the picture, below the
 * content, and covers the whole section however long it is. Content keeps its own opacity.
 *
 * Simple first: a shape (three presets) at the overlay's strength (Light, Medium, Strong) gives a
 * finished gradient made from the site's own colours. Advanced, each of the three stops can take its
 * own colour and opacity; anything left empty follows the preset. Kept free of Studio code so the
 * site can import it, and free of CSS variables in its maths, so the Studio preview and the contrast
 * check draw and measure exactly what the page draws.
 */

export const OVERLAY_GRADIENTS = ['deepen', 'even', 'focus'] as const
export type OverlayGradient = (typeof OVERLAY_GRADIENTS)[number]

export const OVERLAY_GRADIENT_TITLES: Record<OverlayGradient, string> = {
  deepen: 'Soft top, deep bottom',
  even: 'Even atmosphere',
  focus: 'Focused centre',
}

export const OVERLAY_GRADIENT_DESCRIPTIONS: Record<OverlayGradient, string> = {
  deepen: 'The photo stays bright at the top and deepens to a dark brand colour at the bottom.',
  even: 'A gentle brand tint over the whole photo, a little deeper at the bottom.',
  focus: 'Darker edges draw the eye to the middle.',
}

/** What each stop may be: the section's own colour, the fixed washes, the brand colours, or Custom. */
export const GRADIENT_STOP_COLOURS = [
  'background',
  'light',
  'dark',
  'accent',
  'accent-deep',
  'accent-2',
  'highlight',
  'custom',
] as const
export type GradientStopColour = (typeof GRADIENT_STOP_COLOURS)[number]

export const GRADIENT_STOP_TITLES: Record<GradientStopColour, string> = {
  background: 'Background colour',
  light: 'Light',
  dark: 'Dark',
  accent: 'Primary',
  'accent-deep': 'Deep Primary',
  'accent-2': 'Secondary',
  highlight: 'Highlight',
  custom: 'Custom',
}

export const GRADIENT_STOPS = ['top', 'middle', 'bottom'] as const
export type GradientStop = (typeof GRADIENT_STOPS)[number]

/** The strengths an overlay has (`none` draws no overlay at all). */
type Strength = 'light' | 'medium' | 'strong'

/** An exact opacity an editor may set for a stop, in percent. */
export const GRADIENT_OPACITY_RANGE = { min: 0, max: 90 } as const

interface PresetStop {
  colour: GradientStopColour
  alpha: Record<Strength, number>
}

/**
 * The presets. Deepen: the section's colour, barely there at the top; Primary through the middle;
 * a deep Primary at the bottom, strong enough to sit links on. The stops' opacity rises with the
 * overlay's strength.
 */
const PRESETS: Record<OverlayGradient, Record<GradientStop, PresetStop>> = {
  deepen: {
    top: { colour: 'background', alpha: { light: 0.04, medium: 0.08, strong: 0.14 } },
    middle: { colour: 'accent', alpha: { light: 0.1, medium: 0.2, strong: 0.34 } },
    bottom: { colour: 'accent-deep', alpha: { light: 0.36, medium: 0.55, strong: 0.75 } },
  },
  even: {
    top: { colour: 'accent', alpha: { light: 0.14, medium: 0.26, strong: 0.42 } },
    middle: { colour: 'accent', alpha: { light: 0.18, medium: 0.32, strong: 0.5 } },
    bottom: { colour: 'accent-deep', alpha: { light: 0.26, medium: 0.42, strong: 0.62 } },
  },
  focus: {
    top: { colour: 'dark', alpha: { light: 0, medium: 0, strong: 0.06 } },
    middle: { colour: 'dark', alpha: { light: 0.12, medium: 0.22, strong: 0.36 } },
    bottom: { colour: 'dark', alpha: { light: 0.38, medium: 0.58, strong: 0.78 } },
  },
}

/** One stop as stored (Advanced). Empty properties follow the preset. */
export interface GradientStopInput {
  colour?: string | null
  hex?: string | null
  opacity?: number | null
}

export interface OverlayGradientInput {
  overlayGradient?: string | null
  overlayGradientTop?: GradientStopInput | null
  overlayGradientMiddle?: GradientStopInput | null
  overlayGradientBottom?: GradientStopInput | null
}

export interface ResolvedStop {
  colour: GradientStopColour
  /** A valid hex, for Custom. */
  hex?: string
  /** 0 to 1. */
  alpha: number
}

export interface ResolvedOverlayGradient {
  shape: OverlayGradient
  stops: Record<GradientStop, ResolvedStop>
}

const STORED: Record<GradientStop, keyof OverlayGradientInput> = {
  top: 'overlayGradientTop',
  middle: 'overlayGradientMiddle',
  bottom: 'overlayGradientBottom',
}

/** The gradient a section draws at `strength`: the preset, with any stop the editor set over it. */
export function resolveOverlayGradient(
  input: OverlayGradientInput | null | undefined,
  strength: Strength,
): ResolvedOverlayGradient {
  const shape =
    OVERLAY_GRADIENTS.find((value) => value === stegaClean(input?.overlayGradient)) ?? 'deepen'
  const stops = {} as Record<GradientStop, ResolvedStop>
  for (const stop of GRADIENT_STOPS) {
    const preset = PRESETS[shape][stop]
    const stored = input?.[STORED[stop]] as GradientStopInput | null | undefined
    const chosen = GRADIENT_STOP_COLOURS.find((value) => value === stegaClean(stored?.colour))
    const hex = chosen === 'custom' ? validColour(stegaClean(stored?.hex)) : null
    // A Custom without a valid hex follows the preset, as every other unfinished choice does.
    const colour = chosen && (chosen !== 'custom' || hex) ? chosen : preset.colour
    const opacity = stored?.opacity
    const alpha =
      typeof opacity === 'number' && Number.isFinite(opacity)
        ? Math.min(GRADIENT_OPACITY_RANGE.max, Math.max(GRADIENT_OPACITY_RANGE.min, opacity)) / 100
        : preset.alpha[strength]
    stops[stop] = colour === 'custom' && hex ? { colour, hex, alpha } : { colour, alpha }
  }
  return { shape, stops }
}

/** How a stop's colour is written: CSS variables on the page, hex in the Studio. */
export type StopColourOf = (stop: ResolvedStop) => string

/**
 * On the page. The brand colours are the root ones (`--tone-accent` is Primary before a tone changes
 * it), so a gradient over a dark section is still the brand's; Background is the section's own colour.
 */
export const stopColourCss =
  (tone: string): StopColourOf =>
  (stop) => {
    switch (stop.colour) {
      case 'background':
        return tone === 'alt' ? 'var(--color-surface-alt)' : 'var(--color-surface)'
      case 'light':
        return SECTION_WASH_COLOURS.light
      case 'dark':
        return SECTION_WASH_COLOURS.dark
      case 'accent':
        return 'var(--tone-accent)'
      case 'accent-deep':
        return `color-mix(in oklch, var(--tone-accent) 45%, ${SECTION_WASH_COLOURS.dark})`
      case 'accent-2':
        return 'var(--color-accent-2)'
      case 'highlight':
        return 'var(--color-highlight)'
      case 'custom':
        return stop.hex ?? 'transparent'
    }
  }

const percent = (fraction: number) => `${String(Math.round(fraction * 1000) / 10)}%`
const at = (colour: string, alpha: number) =>
  alpha <= 0 ? 'transparent' : `color-mix(in oklch, ${colour} ${percent(alpha)}, transparent)`
/** A point `share` of the way from `a` to `b` (both already see-through). */
const between = (a: string, b: string, share: number) =>
  `color-mix(in oklch, ${a}, ${b} ${percent(share)})`

/**
 * The gradient as a CSS `background-image`. The three stops are spread with eased in-between stops,
 * so the top stays light for longer and the change is gradual rather than a band: a linear gradient
 * top to bottom, or for Focused centre an ellipse from the middle (top is the centre, bottom the edges).
 */
export function overlayGradientCss(
  gradient: ResolvedOverlayGradient,
  colourOf: StopColourOf,
): string {
  const { top, middle, bottom } = gradient.stops
  const [a, b, c] = [top, middle, bottom].map((stop) => at(colourOf(stop), stop.alpha)) as [
    string,
    string,
    string,
  ]
  if (gradient.shape === 'focus') {
    return `radial-gradient(ellipse farthest-corner at 50% 45%, ${a} 0%, ${a} 30%, ${between(a, b, 0.6)} 52%, ${b} 66%, ${between(b, c, 0.55)} 84%, ${c} 100%)`
  }
  return `linear-gradient(to bottom, ${a} 0%, ${between(a, b, 0.35)} 25%, ${b} 50%, ${between(b, c, 0.45)} 72%, ${c} 100%)`
}
