import { hexToOklch, hexToRgb, oklchToHex } from './oklch.ts'

/** WCAG 2.x relative luminance of a "#rrggbb" colour. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((value) => {
    const channel = value / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two "#rrggbb" colours, from 1 (identical) to 21 (black on white). */
export function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ]
  return (lighter + 0.05) / (darker + 0.05)
}

export interface LightnessAdjustment {
  /** The colour to use: the input when it already passes, otherwise the nearest one that does. */
  hex: string
  /** True when the lightness had to change. */
  adjusted: boolean
  /** The contrast ratio of `hex` against the background. */
  ratio: number
}

/**
 * Moves a colour's OKLCH lightness (hue and chroma stay) by the smallest amount that reaches
 * `minRatio` against `background`: darker on a light background, lighter on a dark one. If that
 * direction can't get there, the other direction is tried. 4.5 is WCAG's text threshold, 3 its
 * non-text UI one.
 */
export function adjustLightnessForContrast(
  hex: string,
  background: string,
  minRatio: number,
): LightnessAdjustment {
  const original = hex.toLowerCase()
  const start = contrastRatio(original, background)
  if (start >= minRatio) return { hex: original, adjusted: false, ratio: start }

  const { l, c, h } = hexToOklch(original)
  const darkerFirst = relativeLuminance(background) > 0.18
  for (const target of darkerFirst ? [0, 1] : [1, 0]) {
    if (contrastRatio(oklchToHex({ l: target, c, h }), background) < minRatio) continue
    // `pass` always meets the ratio and `fail` never does; they close in on the boundary.
    let pass = target
    let fail = l
    for (let step = 0; step < 30; step++) {
      const mid = (pass + fail) / 2
      if (contrastRatio(oklchToHex({ l: mid, c, h }), background) >= minRatio) pass = mid
      else fail = mid
    }
    const result = oklchToHex({ l: pass, c, h })
    return { hex: result, adjusted: true, ratio: contrastRatio(result, background) }
  }
  // Unreachable for WCAG ratios up to 4.58 (black or white always gets there); keep the colour.
  return { hex: original, adjusted: false, ratio: start }
}
