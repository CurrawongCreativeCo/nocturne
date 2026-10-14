/**
 * Hex <-> OKLCH. Dependency-free and import-free on purpose: scripts/build-tokens.mjs and
 * scripts/check-studio-brand.mjs load it directly with Node's TypeScript stripping, so keep it to
 * erasable syntax (no enums, no parameter properties).
 */

export type Rgb = [number, number, number]
export interface Oklch {
  l: number
  c: number
  h: number
}

export const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

/** "#rrggbb" -> [r, g, b] (0-255). */
export function hexToRgb(hex: string): Rgb {
  return [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16)) as Rgb
}

/** [r, g, b] (0-255, rounded and clamped) -> lowercase "#rrggbb". */
export function rgbToHex(rgb: readonly number[]): string {
  const channels = rgb.map((channel) =>
    Math.round(Math.min(255, Math.max(0, channel)))
      .toString(16)
      .padStart(2, '0'),
  )
  return `#${channels.join('')}`
}

const toLinear = (channel: number) => {
  const value = channel / 255
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

const toEncoded = (linear: number) => {
  const clamped = Math.min(1, Math.max(0, linear))
  return (clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055) * 255
}

/** sRGB (0-255) -> OKLCH. Hue is in degrees (0-360), 0 for greys. */
export function rgbToOklch([r, g, b]: Rgb): Oklch {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)] as Rgb
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const chroma = Math.hypot(a, bb)
  // Below this chroma the hue is numerical noise, so report a stable 0.
  const hue = chroma < 1e-4 ? 0 : ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360
  return { l: lightness, c: chroma, h: hue }
}

/** OKLCH -> sRGB (0-255), unrounded and clamped per channel (out-of-gamut colours get clipped). */
export function oklchToRgb(lightness: number, chroma: number, hueDegrees: number): Rgb {
  const hue = (hueDegrees * Math.PI) / 180
  const a = chroma * Math.cos(hue)
  const b = chroma * Math.sin(hue)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    toEncoded(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toEncoded(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toEncoded(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]
}

export function hexToOklch(hex: string): Oklch {
  return rgbToOklch(hexToRgb(hex))
}

/** Whether an OKLCH colour fits inside sRGB without clipping. */
function inGamut(l: number, c: number, h: number): boolean {
  const hue = (h * Math.PI) / 180
  const a = c * Math.cos(hue)
  const b = c * Math.sin(hue)
  const lc = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mc = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const sc = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const linear = [
    4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc,
    -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc,
    -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc,
  ]
  return linear.every((channel) => channel >= -0.0005 && channel <= 1.0005)
}

/**
 * OKLCH -> "#rrggbb". A colour outside sRGB keeps its lightness and hue and loses chroma until it
 * fits, so changing lightness never shifts a colour's hue the way per-channel clipping does.
 */
export function oklchToHex({ l, c, h }: Oklch): string {
  const lightness = Math.min(1, Math.max(0, l))
  let chroma = Math.max(0, c)
  if (!inGamut(lightness, chroma, h)) {
    let low = 0
    let high = chroma
    for (let step = 0; step < 24; step++) {
      const mid = (low + high) / 2
      if (inGamut(lightness, mid, h)) low = mid
      else high = mid
    }
    chroma = low
  }
  return rgbToHex(oklchToRgb(lightness, chroma, h))
}
