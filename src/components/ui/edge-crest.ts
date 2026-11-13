/**
 * The crest grammar new section edges are drawn with (task 151, Stage 3 section 4): an asymmetric crest, a
 * rescale to the band, Flip, and a curve turned into a path. Ported from the Divider Design Lab, so a
 * geometry tuned there draws the same here. Pure and deterministic: paths are rounded to 4 decimals, as
 * section-edges.ts rounds today's shapes. Today's shapes don't use it; they keep their own lines.
 *
 * The box is every edge's: x runs from 0 (left) to 1 (right); y from the top of the band (0) to the
 * section's bottom (1).
 */

/** A curve across the band: y for each x. */
export type EdgeCurve = (x: number) => number

/** An asymmetric Gaussian crest at `centre`, `left` wide on its left and `right` wide on its right; 1 at its peak. */
export function bump(x: number, centre: number, left: number, right: number): number {
  const t = (x - centre) / (x < centre ? left : right)
  return Math.exp(-t * t)
}

/** `curve` rescaled to run from 0 to 1 across the band, read at `samples` + 1 points. A flat curve becomes 0. */
export function normalise(curve: EdgeCurve, samples = 400): EdgeCurve {
  let low = Infinity
  let high = -Infinity
  for (let i = 0; i <= samples; i++) {
    const y = curve(i / samples)
    low = Math.min(low, y)
    high = Math.max(high, y)
  }
  const span = high - low || 1
  return (x) => (curve(x) - low) / span
}

/** `curve` mirrored left to right, when `flip` is on. */
export const flipCurve = (curve: EdgeCurve, flip: boolean): EdgeCurve =>
  flip ? (x) => curve(1 - x) : curve

const round = (n: number) => String(Math.round(n * 10_000) / 10_000)

/** How far either side of x the slope is read. */
const SLOPE_STEP = 1e-4

/**
 * `curve` as an open path of cubic Béziers, one per step, each handle set from the curve's slope so the
 * line stays smooth when the band stretches. It is the method today's waves are drawn with: for the same
 * sine it gives their paths byte for byte. `from` and `to` set the domain, so a layer can later be drawn past
 * the band's sides for motion (Task 217).
 */
export function pathFromFunction(curve: EdgeCurve, from = 0, to = 1, steps = 64): string {
  const slope = (x: number) => (curve(x + SLOPE_STEP) - curve(x - SLOPE_STEP)) / (2 * SLOPE_STEP)
  const dx = (to - from) / steps
  let path = `M${round(from)} ${round(curve(from))}`
  for (let i = 0; i < steps; i++) {
    const x0 = from + i * dx
    const x1 = x0 + dx
    const handles = [
      x0 + dx / 3,
      curve(x0) + (slope(x0) * dx) / 3,
      x1 - dx / 3,
      curve(x1) - (slope(x1) * dx) / 3,
      x1,
      curve(x1),
    ]
    path += `C${handles.map(round).join(' ')}`
  }
  return path
}
