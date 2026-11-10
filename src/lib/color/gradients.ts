import { contrastRatio } from './contrast'
import { HEX_PATTERN, hexToRgb, rgbToHex } from './oklch'

/**
 * The brand gradients from Design settings, as the site and the Studio both need them: a stable
 * slug per gradient (the CSS variable is `--gradient-<slug>`, and a section's background stores the
 * slug), the CSS and the colour stops. One place decides which entries are usable and what they are
 * called, so the Studio list can never offer a name the page does not define.
 */

export interface GradientInput {
  name?: string | null
  angle?: number | null
  stops?: readonly (string | null)[] | null
}

export interface BrandGradient {
  slug: string
  name: string
  angle: number
  /** Two or three "#rrggbb" colours, in order. */
  stops: readonly string[]
  css: string
}

/** What a section's stored gradient may look like; anything else is ignored rather than put in CSS. */
export const GRADIENT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
}

const cleanHex = (value: string | null | undefined) =>
  value && HEX_PATTERN.test(value) ? value.toLowerCase() : undefined

/**
 * The usable gradients, in the order they were entered: two or three valid colours each. Names that
 * slugify to the same thing get `-2`, `-3`...; a gradient with no name is `gradient-<position>`.
 */
export function brandGradients(
  gradients: readonly (GradientInput | null)[] | null | undefined,
): BrandGradient[] {
  const used = new Set<string>()
  const found: BrandGradient[] = []
  ;(gradients ?? []).forEach((gradient, index) => {
    const stops = (gradient?.stops ?? []).map(cleanHex)
    const valid = stops.filter((stop): stop is string => stop !== undefined)
    if (!gradient || valid.length < 2 || valid.length > 3 || valid.length !== stops.length) return
    const base = slugify(gradient.name ?? '') || `gradient-${index + 1}`
    let slug = base
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`
    used.add(slug)
    const degrees = gradient.angle
    const angle =
      typeof degrees === 'number' && Number.isFinite(degrees)
        ? Math.round(((degrees % 360) + 360) % 360)
        : 135
    found.push({
      slug,
      name: gradient.name?.trim() || slug,
      angle,
      stops: valid,
      css: `linear-gradient(${angle}deg, ${valid.join(', ')})`,
    })
  })
  return found
}

/** Samples per transition when checking text over a gradient: both stops, the midpoint and the points between. */
const SAMPLES_PER_TRANSITION = 16

/**
 * The colours a browser paints along a gradient's line, in order: every stop, the midpoint of each
 * transition and the points between. `linear-gradient()` blends in gamma-encoded sRGB by default
 * and these buttons are opaque, so a plain per-channel blend, rounded to the 8-bit value a screen
 * shows, is what is drawn. Every point of the box lies on that line, whatever the angle.
 */
export function gradientSamples(stops: readonly string[]): string[] {
  const channels = stops.map(hexToRgb)
  const samples: string[] = []
  channels.forEach((from, index) => {
    const to = channels[index + 1]
    if (!to) return
    for (let step = index === 0 ? 0 : 1; step <= SAMPLES_PER_TRANSITION; step++) {
      const t = step / SAMPLES_PER_TRANSITION
      samples.push(
        rgbToHex(from.map((value, channel) => value + ((to[channel] ?? value) - value) * t)),
      )
    }
  })
  return samples
}

/** The site's own dark and light inks first; pure black only when neither reaches the ratio. */
const INK_TIERS = [['#030712', '#ffffff'], ['#000000']] as const

/**
 * The text colour that reads on every point of the gradient (`minRatio` or better): of the site's
 * dark and light inks, the one with the most contrast at its worst point, else pure black. Undefined
 * when no single colour manages it, so the caller draws something else instead of a button whose
 * text fails somewhere along its fill.
 */
export function gradientInk(
  stops: readonly string[],
  minRatio: number,
): { ink: string; ratio: number } | undefined {
  const samples = gradientSamples(stops)
  for (const tier of INK_TIERS) {
    let best: { ink: string; ratio: number } | undefined
    for (const ink of tier) {
      const ratio = Math.min(...samples.map((sample) => contrastRatio(ink, sample)))
      if (ratio >= minRatio && (!best || ratio > best.ratio)) best = { ink, ratio }
    }
    if (best) return best
  }
  return undefined
}
