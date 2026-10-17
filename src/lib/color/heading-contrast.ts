import { HEADING_GRADIENTS, gradientFor, type GradientToken } from '@/config/heading-gradients'
import { colorHex, emphasis } from '@/config/tokens.generated'

import { adjustLightnessForContrast, contrastRatio } from './contrast'
import type { BrandGradient } from './gradients'
import { CUSTOM_GRADIENT, brandColoursSlug, validColour, validStops } from './heading-gradient'
import { hexToOklch, hexToRgb, oklchToHex, rgbToHex } from './oklch'

/**
 * Contrast checks for highlighted heading words against the section's tone background. Headings are
 * large text, so WCAG 2.2 asks for 3:1 (1.4.3), and every gradient stop has to reach it. The colours
 * mirror what the page draws: the `[data-tone]` rules in tokens.generated.css redefine `accent` and
 * `ink` per tone, and this file resolves them the same way.
 */

export const LARGE_TEXT_RATIO = 3

export type HeadingTone = 'surface' | 'alt' | 'inverse' | 'accent'
export type EmphasisTreatment =
  'brand' | 'colour' | 'gradient' | 'highlight' | 'underline' | 'plain'

type Palette = Record<GradientToken, string>

/** Linear blend of two colours in OKLab, as CSS `color-mix(in oklab, a p%, b)` does. */
function mixOklab(a: string, b: string, share: number): string {
  const toLab = (hex: string) => {
    const { l, c, h } = hexToOklch(hex)
    const radians = (h * Math.PI) / 180
    return { l, a: c * Math.cos(radians), b: c * Math.sin(radians) }
  }
  const [first, second] = [toLab(a), toLab(b)]
  const mixed = {
    l: first.l * share + second.l * (1 - share),
    a: first.a * share + second.a * (1 - share),
    b: first.b * share + second.b * (1 - share),
  }
  const chroma = Math.hypot(mixed.a, mixed.b)
  const hue = ((Math.atan2(mixed.b, mixed.a) * 180) / Math.PI + 360) % 360
  return oklchToHex({ l: mixed.l, c: chroma, h: hue })
}

/** The tone's background and the token colours as that tone redefines them. */
export function tonePalette(tone: string | null | undefined): {
  background: string
  colors: Palette
} {
  const base: Palette = { ...colorHex }
  switch (tone) {
    case 'alt':
      return { background: colorHex.surfaceAlt, colors: base }
    case 'inverse':
      return {
        background: colorHex.surfaceInverse,
        colors: {
          ...base,
          ink: colorHex.inkInverse,
          // --color-accent: color-mix(in oklab, var(--tone-accent) 55%, var(--color-ink-inverse))
          accent: mixOklab(colorHex.accent, colorHex.inkInverse, 0.55),
        },
      }
    case 'accent':
      return {
        background: colorHex.accent,
        colors: { ...base, ink: colorHex.accentInk, accent: colorHex.accentInk },
      }
    default:
      return { background: colorHex.surface, colors: base }
  }
}

/** `colour` laid over `background` at `alpha` (0-1), channel by channel as the browser composites it. */
function composite(colour: string, background: string, alpha: number): string {
  const [top, bottom] = [hexToRgb(colour), hexToRgb(background)]
  return rgbToHex(top.map((channel, i) => channel * alpha + (bottom[i] ?? 0) * (1 - alpha)))
}

export interface EmphasisInput {
  treatment: string | null | undefined
  gradient?: string | null
  /** The annotation's own colours, read when `gradient` is `custom`. */
  stops?: readonly (string | null)[] | null
  /** The solid colour, read when `treatment` is `colour`. */
  colour?: string | null
}

export interface ContrastProblem {
  treatment: EmphasisTreatment
  ratio: number
  message: string
}

const TITLES: Record<EmphasisTreatment, string> = {
  brand: 'Brand colour',
  colour: 'Solid colour',
  gradient: 'Gradient',
  highlight: 'Highlight colour',
  underline: 'Underline',
  plain: 'Bold or italic',
}

/** What a gradient choice draws, as hex colours; the default preset when the choice cannot be drawn. */
function gradientColours(
  tone: string | null | undefined,
  { gradient, stops }: EmphasisInput,
  brand: readonly BrandGradient[],
): { stops: string[]; name: string; custom: boolean } {
  const { colors } = tonePalette(tone)
  if (gradient === CUSTOM_GRADIENT) {
    const clean = validStops(stops)
    if (clean) return { stops: clean, name: 'Custom gradient', custom: true }
  }
  const slug = brandColoursSlug(gradient)
  const named = slug ? brand.find((candidate) => candidate.slug === slug) : undefined
  if (named) return { stops: [...named.stops], name: `Gradient "${named.name}"`, custom: true }
  const preset = gradientFor(gradient)
  return {
    stops: preset.stops.map((stop) => colors[stop]),
    name: `Gradient "${preset.title}"`,
    custom: false,
  }
}

/** The colours a treatment puts against the tone background: what to measure. */
function measured(
  tone: string | null | undefined,
  input: EmphasisInput,
  brand: readonly BrandGradient[],
) {
  const { background, colors } = tonePalette(tone)
  switch (input.treatment) {
    case 'gradient':
      return gradientColours(tone, input, brand).stops.map((foreground) => ({
        foreground,
        background,
      }))
    case 'colour': {
      // An unusable colour is not drawn, so the words keep the section's ink.
      const colour = validColour(input.colour)
      return colour ? [{ foreground: colour, background }] : []
    }
    case 'highlight':
      // The text keeps the tone's ink; the accent tints the area behind it.
      return [
        {
          foreground: colors.ink,
          background: composite(colors.accent, background, emphasis.highlightStrength),
        },
      ]
    case 'brand':
    case 'underline':
      return [{ foreground: colors.accent, background }]
    default:
      return []
  }
}

/** How one colour reads on the section's background, and the nearest shade that reaches 3:1. */
export function stopContrast(tone: string | null | undefined, hex: string) {
  const { background } = tonePalette(tone)
  const ratio = contrastRatio(hex, background)
  const suggestion =
    ratio < LARGE_TEXT_RATIO ? adjustLightnessForContrast(hex, background, LARGE_TEXT_RATIO) : null
  return {
    background,
    ratio,
    pass: ratio >= LARGE_TEXT_RATIO,
    suggestion: suggestion?.adjusted ? suggestion.hex : null,
  }
}

/** The key a phrase is counted under, so identical gradients are reported once. */
function problemId(
  input: EmphasisInput,
  treatment: EmphasisTreatment,
  tone: string | null | undefined,
  brand: readonly BrandGradient[],
) {
  if (treatment === 'colour') return `colour:${validColour(input.colour) ?? ''}`
  if (treatment !== 'gradient') return treatment
  return `gradient:${gradientColours(tone, input, brand).stops.join(',')}`
}

/**
 * Treatments below 3:1 on this tone, worst first, one message each. `null` or unknown treatments
 * (content from a newer deployment) pass: there is nothing to measure. `brand` is the Brand colours
 * gradients, for phrases that picked one by name; one that is gone is measured as the default,
 * which is what the page then draws.
 */
export function emphasisContrastProblems(
  tone: string | null | undefined,
  inputs: readonly EmphasisInput[],
  brand: readonly BrandGradient[] = [],
): ContrastProblem[] {
  const seen = new Set<string>()
  const problems: ContrastProblem[] = []
  for (const input of inputs) {
    const treatment = input.treatment as EmphasisTreatment
    if (!(treatment in TITLES)) continue
    const id = problemId(input, treatment, tone, brand)
    if (seen.has(id)) continue
    seen.add(id)
    const pairs = measured(tone, input, brand).map((pair) => ({
      ...pair,
      ratio: contrastRatio(pair.foreground, pair.background),
    }))
    const worst = pairs.reduce<(typeof pairs)[number] | undefined>(
      (a, b) => (!a || b.ratio < a.ratio ? b : a),
      undefined,
    )
    if (worst && worst.ratio < LARGE_TEXT_RATIO) {
      const gradient = treatment === 'gradient' ? gradientColours(tone, input, brand) : null
      // A custom gradient names the colour to fix; the presets are named by title.
      const label = gradient
        ? gradient.custom
          ? `${gradient.name} (${worst.foreground})`
          : gradient.name
        : treatment === 'colour'
          ? `Solid colour (${worst.foreground})`
          : TITLES[treatment]
      problems.push({
        treatment,
        ratio: worst.ratio,
        message: `${label} is hard to read on this background (contrast ${worst.ratio.toFixed(1)}:1; large text needs ${LARGE_TEXT_RATIO}:1). ${gradient?.custom || treatment === 'colour' ? 'Change that colour' : 'Pick another treatment'}, or change the section's background.`,
      })
    }
  }
  return problems.sort((a, b) => a.ratio - b.ratio)
}

/** Every preset, for tests that guard the shipped gradients against the default tones. */
export const gradientValues: readonly string[] = HEADING_GRADIENTS.map(({ value }) => value)
