/** A flick faster than this (px/s) moves at least one slide, however short the drag. */
export const FLICK_VELOCITY = 400
/** A drag shorter than this share of a slide, without a flick, springs back. */
const DRAG_THRESHOLD = 0.2
/** How far ahead (s) the velocity carries the finger, so a fast flick can pass several slides. */
const PROJECTION_SECONDS = 0.15

interface SnapInput {
  /** Horizontal distance dragged (px). Negative is leftwards, which moves forward. */
  offset: number
  /** Horizontal velocity at release (px/s), same sign convention. */
  velocity: number
  /** Distance between the starts of two neighbouring slides (px), gap included. */
  slideWidth: number
  /** The index the drag started from. */
  index: number
  /** How many positions the slider can rest at (so the last index is count - 1). */
  count: number
}

/**
 * Which position the track settles on when a drag ends. The finger's travel plus a short projection
 * of its velocity, in slides, rounded; a slow drag past a fifth of a slide, or any flick, moves at
 * least one slide in its direction. Always within 0..count - 1.
 */
export function snapIndex({ offset, velocity, slideWidth, index, count }: SnapInput): number {
  const last = Math.max(0, count - 1)
  if (slideWidth <= 0 || count <= 1) return Math.min(Math.max(index, 0), last)

  const projected = offset + velocity * PROJECTION_SECONDS
  let moved = Math.round(-projected / slideWidth)

  // Too short to round to a slide, but clearly meant: a quick flick or a deliberate drag.
  if (moved === 0) {
    const direction = projected === 0 ? 0 : projected < 0 ? 1 : -1
    if (Math.abs(velocity) >= FLICK_VELOCITY || Math.abs(offset) >= slideWidth * DRAG_THRESHOLD) {
      moved = direction
    }
  }

  return Math.min(Math.max(index + moved, 0), last)
}

/** The track's x (px, 0 or negative) at an index; the last stop is flush with the viewport's end. */
export function trackOffset(index: number, slideWidth: number, maxScroll: number): number {
  return -Math.min(Math.max(index, 0) * slideWidth, Math.max(maxScroll, 0))
}

/** How many positions a track of `maxScroll` px can rest at, one per slide step. */
export function stopCount(maxScroll: number, slideWidth: number): number {
  // A pixel of tolerance so sub-pixel rounding doesn't add a stop that moves nothing.
  if (slideWidth <= 0 || maxScroll <= 1) return 1
  return Math.ceil((maxScroll - 1) / slideWidth) + 1
}
