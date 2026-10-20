/**
 * Layered design settings (README, "Link list": Card design and overrides). A component's look is
 * resolved from up to four layers, each more specific than the last:
 *
 *   1. the site's design tokens (the CSS variables every class reads),
 *   2. the component's own preset (a layout's classes, Glass rows' glass),
 *   3. the section's settings (the Link list's Design tab),
 *   4. one item's overrides (a single link's Appearance).
 *
 * Layers 1 and 2 are the component's code. Layers 3 and 4 are stored values, each resolved first to a
 * partial design where a property is either present (a value the editor chose) or absent (inherit).
 * `layerDesign` then lays them over each other one property at a time: the most specific value
 * wins for that property only, so a card that sets its border keeps the list's background, label size
 * and everything else.
 *
 * Only `undefined` means "inherit". Every chosen value is kept, including the deliberate "off"
 * values: a border of `'none'`, a `'transparent'` background, a `'flat'` shadow, an arrow of
 * `'none'`, `0` and `false`. Never fall back with `||` or `??` on stored values before they are
 * resolved: resolvers turn unknown or unset stored values into `undefined`, and nothing else.
 */

export type DesignLayer<T> = { readonly [K in keyof T]?: T[K] | undefined }

/** The properties of `layer` that hold a value (anything but `undefined`). */
export function definedOnly<T extends object>(
  layer: DesignLayer<T> | null | undefined,
): Partial<T> {
  const result: Partial<T> = {}
  if (!layer) return result
  for (const key of Object.keys(layer) as (keyof T)[]) {
    const value = layer[key]
    if (value !== undefined) result[key] = value
  }
  return result
}

/** Lays design layers over each other, least specific first: per property, the last defined value wins. */
export function layerDesign<T extends object>(
  ...layers: readonly (DesignLayer<T> | null | undefined)[]
): Partial<T> {
  return Object.assign({}, ...layers.map((layer) => definedOnly(layer))) as Partial<T>
}
