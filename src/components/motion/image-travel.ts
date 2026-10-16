/**
 * The maths behind a picture that moves inside a still frame (components/ui/framed-image.tsx).
 *
 * Parallax moves its content by `speed × factor` of its own height each way, with the factor 0.2 from
 * `md` up and 0.1 below (half the travel on a phone). The picture is scaled by exactly twice that
 * travel so no edge ever shows. A picture's travel is a share of its height, kept to a range that
 * scales it by 1.05 to 1.15: less would look like a flat crop, more starts to soften the photo.
 */

/** Parallax's `--parallax-factor` from `md` up. The travel on a phone is half of it (see Parallax). */
export const PARALLAX_FACTOR = 0.2

/** The scale a moving picture is drawn at: never less than this, so a rounding error can't show an edge... */
export const SCALE_MIN = 1.05
/** ...and never more than this, so the photo stays sharp. */
export const SCALE_MAX = 1.15

/** Each way, as a share of the frame's height, from `md` up. 2.5 % scales by 1.05, 7.5 % by 1.15. */
export const TRAVEL_MIN = 0.025
export const TRAVEL_MAX = 0.075

/** Travel (share of height, each way) of the named strengths. Subtle matches the section Parallax preset. */
export const MOTION_TRAVEL = { subtle: 0.03, medium: 0.06 } as const

const round = (value: number, places = 3) => {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** The scale that covers a travel (each way, share of height), within 1.05 to 1.15. */
export function scaleForTravel(travel: number): number {
  return round(clamp(1 + 2 * travel, SCALE_MIN, SCALE_MAX))
}

/** The Parallax `speed` (its amount) that moves a picture by a travel from `md` up. */
export function speedForTravel(travel: number): number {
  return round(clamp(travel, 0, TRAVEL_MAX) / PARALLAX_FACTOR)
}

/** The travel a Parallax speed gives from `md` up: the inverse of `speedForTravel`. */
export function travelForSpeed(speed: number): number {
  return round(Math.abs(speed) * PARALLAX_FACTOR)
}

export interface ImageMotionInput {
  /** Travel each way as a share of the frame's height (0.03 = 3 %), from `md` up. */
  travel: number
  /** `down` (the picture drifts down inside its frame as the page scrolls up) or `up`. */
  direction?: 'up' | 'down'
  /** Draws the picture at this scale instead of the one the travel needs. Travel is then held to fit it. */
  scale?: number
  /** A first section is on screen at scroll 0, so its picture rests unshifted there. */
  isFirst?: boolean
}

export interface ImageMotion {
  /** For Parallax: signed (negative moves the other way). */
  speed: number
  from: 'viewport' | 'top'
  /** The picture's scale from `md` up, and below it (where the travel is half). */
  scale: number
  scalePhone: number
  /** The travel each way (share of height) after being held within the scale, from `md` up. */
  travel: number
}

/**
 * A moving picture's speed and scales. The travel is held within 2.5 to 7.5 %, and within what a
 * chosen scale covers; the scale is held within 1.05 to 1.15. On a phone the travel is half, so the
 * scale needed there is smaller, but never less than 1.05, or a chosen override.
 */
export function resolveImageMotion({
  travel,
  direction = 'down',
  scale,
  isFirst = false,
}: ImageMotionInput): ImageMotion {
  const chosen =
    typeof scale === 'number' && Number.isFinite(scale)
      ? round(clamp(scale, SCALE_MIN, SCALE_MAX))
      : undefined
  const wanted = clamp(
    Number.isFinite(travel) ? travel : MOTION_TRAVEL.subtle,
    TRAVEL_MIN,
    TRAVEL_MAX,
  )
  const held = chosen ? Math.min(wanted, (chosen - 1) / 2) : wanted
  return {
    speed: (direction === 'up' ? -1 : 1) * speedForTravel(held),
    from: isFirst ? 'top' : 'viewport',
    scale: chosen ?? scaleForTravel(held),
    scalePhone: chosen ?? scaleForTravel(held / 2),
    travel: round(held),
  }
}
