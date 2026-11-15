/**
 * The Ornament centre's flourish (task 151, Slice 7), the Divider Design Lab's `flourishPath()` ported as it is: one
 * long, soft arch that settles into a small dip before a diamond, drawn from two asymmetric Gaussian crests,
 * as cubic Béziers over a 120 by 24 box, the left half and its mirror. The Lab draws it 90 by 18 px with a 1.3
 * stroke and a 7px diamond at (60, 12). Made once, here, so the markup holds constant strings; a test holds
 * the output to the Lab's own.
 */

/** An asymmetric Gaussian crest: `wl` wide left of its centre `c`, `wr` right of it. */
const bump = (x: number, c: number, wl: number, wr: number) => {
  const t = (x - c) / (x < c ? wl : wr)
  return Math.exp(-t * t)
}

const arch = (x: number) => 0.62 - 0.4 * bump(x, 0.42, 0.26, 0.2) + 0.16 * bump(x, 0.84, 0.1, 0.12)

/** `f` over 0..1 as cubic Béziers, one per step, using its slope so it stays smooth (the Lab's `Geo.path`). */
function bezier(f: (x: number) => number, steps: number) {
  const r = (n: number) => Math.round(n * 1e4) / 1e4
  const slope = (x: number) => (f(x + 1e-4) - f(x - 1e-4)) / 2e-4
  const dx = 1 / steps
  const points: number[][] = [[0, f(0)]]
  for (let i = 0; i < steps; i += 1) {
    const x0 = i * dx
    const x1 = x0 + dx
    points.push(
      [x0 + dx / 3, f(x0) + (slope(x0) * dx) / 3],
      [x1 - dx / 3, f(x1) - (slope(x1) * dx) / 3],
      [x1, f(x1)],
    )
  }
  return points.map(([x, y]) => [r(x ?? 0), r(y ?? 0)] as const)
}

function draw(mirror: boolean) {
  const points = bezier(arch, 24)
  const at = ([x, y]: readonly [number, number]) =>
    `${(mirror ? 120 - x * 50 : x * 50).toFixed(2)} ${(y * 24).toFixed(2)}`
  const [first, ...rest] = points
  let d = `M${at(first as never)}`
  for (let i = 0; i < rest.length; i += 3)
    d += `C${rest
      .slice(i, i + 3)
      .map((point) => at(point))
      .join(' ')}`
  return d
}

/** The left half and its mirror about the diamond. */
export const FLOURISH_PATHS = [draw(false), draw(true)] as const

/** The diamond at the middle: a 7px square turned 45 degrees about (60, 12). */
export const FLOURISH_DIAMOND = { x: 56.5, y: 8.5, size: 7, transform: 'rotate(45 60 12)' } as const
