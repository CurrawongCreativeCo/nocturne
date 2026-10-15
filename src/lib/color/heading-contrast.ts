import { HEADING_GRADIENTS, gradientFor, type GradientToken } from '@/config/heading-gradients'
import { colorHex, emphasis } from '@/config/tokens.generated'

import { contrastRatio } from './contrast'
import { hexToOklch, hexToRgb, oklchToHex, rgbToHex } from './oklch'

/**
 * Contrast checks for highlighted heading words against the section's tone background. Headings are
 * large text, so WCAG 2.2 asks for 3:1 (1.4.3), and every gradient stop has to reach it. The colours
 * mirror what the page draws: the `[data-tone]` rules in tokens.generated.css redefine `accent` and
 * `ink` per tone, and this file resolves them the same way.
 */

export const LARGE_TEXT_RATIO = 3

export type HeadingTone = 'surface' | 'alt' | 'inverse' | 'accent'
export type EmphasisTreatment = 'brand' | 'gradient' | 'highlight' | 'underline'

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
}

export interface ContrastProblem {
  treatment: EmphasisTreatment
  ratio: number
  message: string
}

const TITLES: Record<EmphasisTreatment, string> = {
  brand: 'Brand colour',
  gradient: 'Gradient',
  highlight: 'Highlight colour',
  underline: 'Underline',
}

/** The colours a treatment puts against the tone background: what to measure. */
function measured(tone: string | null | undefined, { treatment, gradient }: EmphasisInput) {
  const { background, colors } = tonePalette(tone)
  switch (treatment) {
    case 'gradient':
      return gradientFor(gradient).stops.map((stop) => ({
        foreground: colors[stop],
        background,
      }))
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

/**
 * Treatments below 3:1 on this tone, worst first, one message each. `null` or unknown treatments
 * (content from a newer deployment) pass: there is nothing to measure.
 */
export function emphasisContrastProblems(
  tone: string | null | undefined,
  inputs: readonly EmphasisInput[],
): ContrastProblem[] {
  const seen = new Set<string>()
  const problems: ContrastProblem[] = []
  for (const input of inputs) {
    const treatment = input.treatment as EmphasisTreatment
    if (!(treatment in TITLES)) continue
    const id = `${treatment}:${treatment === 'gradient' ? gradientFor(input.gradient).value : ''}`
    if (seen.has(id)) continue
    seen.add(id)
    const ratios = measured(tone, input).map((pair) =>
      contrastRatio(pair.foreground, pair.background),
    )
    const worst = Math.min(...ratios)
    if (ratios.length > 0 && worst < LARGE_TEXT_RATIO) {
      const label =
        treatment === 'gradient'
          ? `${TITLES[treatment]} "${gradientFor(input.gradient).title}"`
          : TITLES[treatment]
      problems.push({
        treatment,
        ratio: worst,
        message: `${label} is hard to read on this background (contrast ${worst.toFixed(1)}:1; large text needs ${LARGE_TEXT_RATIO}:1). Pick another treatment, or change the section's background.`,
      })
    }
  }
  return problems.sort((a, b) => a.ratio - b.ratio)
}

/** Every preset, for tests that guard the shipped gradients against the default tones. */
export const gradientValues: readonly string[] = HEADING_GRADIENTS.map(({ value }) => value)
