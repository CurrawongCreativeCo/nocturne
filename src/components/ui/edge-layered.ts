import { bump, flipCurve, normalise, pathFromFunction, type EdgeCurve } from './edge-crest'
import {
  BELOW_OPACITY,
  LAYERED_PRESETS,
  allowsLayerBelow,
  opacityOf,
  separationOf,
  type LayeredShape,
} from './edge-presets'
import type { EdgeComposition, EdgePart, ResolvedEdge } from './section-edges'

/**
 * The layered-edge generator (task 151, Slice 3), ported from the Divider Design Lab's `family()` and
 * `repairDepth()`: a cut drawn from one asymmetric crest, a layer above it and an optional one below, each
 * built from the cut's own crest model, fitted inside the band and then repaired so no layer is a sliver. The
 * generator is pure, deterministic and runs on the server at render: no client JavaScript, nothing stored.
 *
 * DIFFERENCE FROM THE LAB, intended. The Lab generates a shape for the band it is drawn at: its floor (3 px as
 * a share of the band) and its motion headroom change with the band's height, so a phone band gets a
 * different, shallower shape than a desktop one. Here the geometry is generated ONCE, at the constants the Lab
 * reaches from 100 px up (a floor of 3.5% of the band, 3% of headroom), and never reads a height. At 100 px
 * and above the two are the same shape, path for path (edge-layered.test.ts holds that). Below it they
 * differ, by design: the Lab's phone-band repair threshold (1.2 x (floor + headroom)) rises to 0.18 of the
 * band at 40 px, which is almost the whole of a Standard layer's depth, so the layers it draws there vanish.
 * A shape that does not depend on height also cannot be stale: a stored height can change the slope and
 * the 3 px floor but never the shape, and the grid test covers both across every band Studio permits.
 * Motion headroom (Task 217) is therefore 3% of the band, which is 1.2 px at 40 px: that is Task 217's to
 * solve, and nothing here moves.
 */

/** The floor a visible layer keeps from the cut, and the room kept above it, as shares of the band. */
export const LAYER_FLOOR = 0.035
export const LAYER_HEADROOM = 0.03

/**
 * Cubic segments per line: 32, half of what the Lab and today's waves use, because the deviation from the
 * curve stays under 0.05 px on the tallest band a page can draw (160 px; the bar is 0.25 px, Stage 3A
 * section 11). Measured in edge-layered.test.ts, not assumed.
 */
export const LAYER_SEGMENTS = 32

/**
 * A layer's depth repaired in the band's final units: no near misses against the cut, no wedge at either edge,
 * no long shallow taper. The Lab's own repair, for a layer with no second layer on its side (Still water has
 * none), so the pass that keeps two same-side layers apart is not here.
 */
function repairDepth(depth: EdgeCurve, floor: number): EdgeCurve {
  const N = 360
  const fixes: { a: number; c: number; w: number }[] = []
  const get = (x: number) =>
    depth(x) + fixes.reduce((sum, fix) => sum + fix.a * bump(x, fix.c, fix.w, fix.w), 0)
  for (let pass = 0; pass < 10; pass++) {
    let changed = false
    const v = Array.from({ length: N + 1 }, (_, i) => get(i / N))
    for (const [k, c] of [
      [0, 0],
      [N, 1],
    ] as const) {
      const at = v[k] ?? 0
      if (at <= 0 && at > -floor * 0.7) {
        fixes.push({ a: -floor * 0.9, c, w: 0.05 })
        changed = true
      }
    }
    let i = 0
    while (i <= N) {
      const here = v[i] ?? 0
      if (here > 0 && here < floor * 1.2) {
        let j = i
        while (j + 1 <= N && (v[j + 1] ?? 0) > 0 && (v[j + 1] ?? 0) < floor * 1.2) j++
        const leftZero = i > 0 && (v[i - 1] ?? 0) <= 0
        const rightZero = j < N && (v[j + 1] ?? 0) <= 0
        const atEdge = i === 0 || j === N
        const seg = v.slice(i, j + 1)
        const lo = Math.min(...seg)
        const hi = Math.max(...seg)
        const c = atEdge ? (i === 0 ? 0 : 1) : (i + j) / 2 / N
        const w = Math.max(0.06, ((j - i + 1) / N) * 0.9)
        if (atEdge) {
          fixes.push(
            (i === 0 && rightZero) || (j === N && leftZero) || lo < floor * 0.5
              ? { a: -(hi + floor * 0.8), c, w }
              : { a: floor * 1.45 - lo, c, w },
          )
          changed = true
        } else if (!(leftZero || rightZero)) {
          fixes.push(
            lo < floor * 0.55 ? { a: -(lo + floor * 0.9), c, w } : { a: floor * 1.45 - lo, c, w },
          )
          changed = true
        } else if (j - i + 1 > N * 0.05) {
          fixes.push({ a: -(hi + floor * 0.5), c: leftZero ? i / N : j / N, w })
          changed = true
        }
        i = j + 1
      } else i++
    }
    if (!changed) break
  }
  return get
}

/** What a preset's steps come to: the numbers the generator draws from. */
export interface LayeredInput {
  shape: LayeredShape
  /** The crest's centre. */
  crest: number
  /** The separation of the layers from the cut. */
  separation: number
  /** Draw a second layer below the cut. */
  below: boolean
  flip: boolean
}

/** A generated layer's line across the band, and which side of the cut it lies on. */
export interface GeneratedLayer {
  side: 'over' | 'under'
  line: EdgeCurve
}

export interface LayeredGeometry {
  cut: EdgeCurve
  /** The upper layer first, then the lower one when there is one. */
  layers: readonly GeneratedLayer[]
}

/**
 * The geometry of one combination of the preset's steps. The box is every edge's: x from 0 (left) to 1
 * (right), y from the top of the band (0) to the section's bottom (1). A layer above the cut is drawn as a
 * fill from its line down to the cut (the section's mask clips it there); one below as a fill from the cut down
 * to its line.
 */
export function layeredGeometry(input: LayeredInput): LayeredGeometry {
  const { shape: p, crest: c1, separation: sep, below, flip } = input
  const floor = LAYER_FLOOR
  const wl = p.width * p.asym
  const wr = p.width
  const crestShape = normalise((x) => bump(x, c1, wl, wr) + p.tilt * x)
  const roomAbove = sep * 0.7 + 0.06
  // The lower layer needs at least the repair's minimum depth below the cut, or a short band runs out of room.
  const roomBelow = below ? Math.max(sep * 0.75, 1.5 * (floor + LAYER_HEADROOM)) + 0.05 : 0.04
  const cutBottom = 1 - roomBelow
  const amplitude = p.amp * (cutBottom - roomAbove)
  const rawCut: EdgeCurve = (x) => cutBottom - amplitude * crestShape(x)
  // A layer's depth below or above the cut: the cut's crest, offset, with a crest of its own, diving behind the cut.
  const depthOf = (k: number, shift: number, ownAt: number, max: number): EdgeCurve => {
    const g = normalise(
      (x) =>
        crestShape(x - shift) + p.own * bump(x, ownAt, 0.11, 0.15) + 0.18 * (k % 2 ? x : 1 - x),
    )
    const dive = 0.3
    return (x) => (max * (g(x) - dive)) / (1 - dive)
  }
  const upperDepth = depthOf(0, p.spread, (c1 + 0.38) % 1, sep)
  const raw: { side: 'over' | 'under'; line: EdgeCurve }[] = [
    { side: 'over', line: (x) => rawCut(x) - upperDepth(x) },
  ]
  if (below) {
    const lowerDepth = depthOf(2, p.spread * 0.6, (c1 + 0.55) % 1, sep * 0.75)
    raw.push({ side: 'under', line: (x) => rawCut(x) + lowerDepth(x) })
  }
  // Fit everything inside the band, keeping the bottom of the cut where it is when possible.
  let low = Infinity
  let high = -Infinity
  for (const f of [rawCut, ...raw.map((layer) => layer.line)])
    for (let i = 0; i <= 200; i++) {
      const y = f(i / 200)
      low = Math.min(low, y)
      high = Math.max(high, y)
    }
  // A little more room at the top than the bottom, because a repair may thicken a layer by up to about 0.05.
  const top = 0.1
  const bottom = 0.97
  const span = high - low
  const target = bottom - top
  const fit: EdgeCurve =
    span > target
      ? (y) => top + ((y - low) * target) / span
      : low < top
        ? (y) => y + (top - low)
        : high > bottom
          ? (y) => y - (high - bottom)
          : (y) => y
  const cut: EdgeCurve = (x) => fit(rawCut(x))
  // Repaired in the band's final units, where the floor is measured, with headroom kept above it.
  const layers = raw.map(({ side, line }) => {
    const sign = side === 'over' ? 1 : -1
    const depth = repairDepth((x) => sign * (cut(x) - fit(line(x))), floor + LAYER_HEADROOM)
    return { side, line: (x: number) => cut(x) - sign * depth(x) }
  })
  return {
    cut: flipCurve(cut, flip),
    layers: layers.map(({ side, line }) => ({ side, line: flipCurve(line, flip) })),
  }
}

/**
 * The geometry a generated edge is drawn from, or undefined for a shape that is not generated. The resolver has
 * already dropped a layer below that the depth does not offer, but it is held to here as well, so no caller can
 * draw one.
 */
export function layeredGeometryOf(edge: ResolvedEdge): LayeredGeometry | undefined {
  const settings = edge.layered
  if (edge.shape !== 'still-water' || !settings) return undefined
  const preset = LAYERED_PRESETS[edge.shape]
  return layeredGeometry({
    shape: preset.shape,
    crest: preset.crests[settings.crest],
    separation: separationOf(preset, settings.depth),
    below: settings.below && allowsLayerBelow(preset, settings.depth),
    flip: edge.flip,
  })
}

/**
 * A generated edge as a composition: the cut, the layer above it (inside the section, clipped by the cut) and,
 * when the steps ask for one, the layer below (over the section that follows).
 */
export function layeredComposition(edge: ResolvedEdge): EdgeComposition {
  const geometry = layeredGeometryOf(edge)
  if (!geometry || edge.shape !== 'still-water' || !edge.layered) return { cut: '', parts: [] }
  const preset = LAYERED_PRESETS[edge.shape]
  const recipe = preset.recipes[edge.layered.palette]
  const opacity = opacityOf(preset, edge.layered.strength)
  const parts: EdgePart[] = geometry.layers.map((layer) => ({
    kind: 'fill',
    side: layer.side,
    line: pathFromFunction(layer.line, 0, 1, LAYER_SEGMENTS),
    paint: layer.side === 'over' ? recipe.over : recipe.under,
    opacity: layer.side === 'over' ? opacity : opacity * BELOW_OPACITY,
  }))
  return { cut: pathFromFunction(geometry.cut, 0, 1, LAYER_SEGMENTS), parts }
}
