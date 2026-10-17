import { GRADIENT_SLUG_PATTERN } from './gradients'
import { HEX_PATTERN } from './oklch'

/**
 * What an editor can store for a heading's gradient, and how it becomes CSS. The stored `gradient`
 * value is one of: a built-in preset (`brand`, and the older `brand-green` / `brand-red`), `custom`
 * (the annotation's own `stops` and `angle`), or `brand-colours:<slug>` (a named gradient from
 * Design → Brand colours). Nothing from the content reaches CSS except validated six-digit hex
 * colours, an integer angle and a slug that matches `GRADIENT_SLUG_PATTERN`.
 */

export const CUSTOM_GRADIENT = 'custom'
export const BRAND_COLOURS_PREFIX = 'brand-colours:'

/** Left to right, like the presets. */
export const DEFAULT_GRADIENT_ANGLE = 90

export const MIN_CUSTOM_STOPS = 2
export const MAX_CUSTOM_STOPS = 3

/** The stored value that picks a Brand colours gradient. */
export const brandColoursValue = (slug: string) => `${BRAND_COLOURS_PREFIX}${slug}`

/** The slug in a `brand-colours:<slug>` value, or null for anything else (including a malformed slug). */
export function brandColoursSlug(value: string | null | undefined): string | null {
  if (!value?.startsWith(BRAND_COLOURS_PREFIX)) return null
  const slug = value.slice(BRAND_COLOURS_PREFIX.length)
  return GRADIENT_SLUG_PATTERN.test(slug) ? slug : null
}

/**
 * The stops as lowercase "#rrggbb", or null unless there are two or three and every one is valid:
 * a half-filled or tampered gradient is not drawn, so the heading falls back to the default.
 */
export function validStops(stops: readonly (string | null | undefined)[] | null | undefined) {
  if (!stops || stops.length < MIN_CUSTOM_STOPS || stops.length > MAX_CUSTOM_STOPS) return null
  const clean: string[] = []
  for (const stop of stops) {
    if (typeof stop !== 'string' || !HEX_PATTERN.test(stop)) return null
    clean.push(stop.toLowerCase())
  }
  return clean
}

/** A whole number of degrees in 0-359; unset, fractional or non-numeric values give the default. */
export function validAngle(angle: unknown): number {
  if (typeof angle !== 'number' || !Number.isInteger(angle)) return DEFAULT_GRADIENT_ANGLE
  return ((angle % 360) + 360) % 360
}

/** The `linear-gradient()` for a custom gradient, or null when the stops are not valid. */
export function customGradientCss(
  stops: readonly (string | null | undefined)[] | null | undefined,
  angle?: unknown,
): string | null {
  const clean = validStops(stops)
  return clean ? `linear-gradient(${validAngle(angle)}deg, ${clean.join(', ')})` : null
}

/** A single "#rrggbb" colour, lowercased, or null: the only form of a solid colour that reaches CSS. */
export function validColour(colour: unknown): string | null {
  return typeof colour === 'string' && HEX_PATTERN.test(colour) ? colour.toLowerCase() : null
}
