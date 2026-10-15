import { HEX_PATTERN } from './oklch'

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
