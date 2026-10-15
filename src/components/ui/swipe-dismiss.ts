/** A flick faster than this (px/s) dismisses, however short the drag. */
export const DISMISS_VELOCITY = 500
/** A slower drag dismisses once it passes this share of the panel's size. */
const DISMISS_DISTANCE = 0.25

interface DismissInput {
  /** How far the panel was dragged towards the edge it leaves by (px). Negative is the other way. */
  offset: number
  /** Speed at release towards that edge (px/s), same sign convention. */
  velocity: number
  /** The panel's size along the drag (px). */
  size: number
}

/**
 * Whether a drag that has just ended should close the panel it moved (a lightbox swiped down, a
 * drawer swiped aside). A quick flick, or a slower drag past a quarter of the panel, dismisses;
 * anything else, and any drag the wrong way, springs back.
 */
export function shouldDismiss({ offset, velocity, size }: DismissInput): boolean {
  if (offset <= 0 || size <= 0) return false
  return velocity >= DISMISS_VELOCITY || offset >= size * DISMISS_DISTANCE
}
