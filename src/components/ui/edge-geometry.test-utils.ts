import { bump, normalise, type EdgeCurve } from './edge-crest'
import type { LayeredGeometry } from './edge-layered'

/**
 * Test-only: the Divider Design Lab's generator, copied from its source, and the production geometry
 * validator (task 151, Stage 3A section 6). Nothing here ships: runtime code only generates, and these prove
 * that what it generates is sound. Used by edge-layered.test.ts.
 */

const clamp = (low: number, value: number, high: number) => Math.min(high, Math.max(low, value))

/** What the Lab calls a preset's parameters (its `FAMILY_DEFAULTS` and sliders), for the shapes drawn here. */
export interface LabParams {
  crest: number
  amp: number
  asym: number
  width: number
  second: number
  tilt: number
  sep: number
  spread: number
  own: number
  vary: number
  dive: boolean
  overlap: number
  /** 0, 1 or 2 layers above the cut. */
  over: number
  under: boolean
  hairline: boolean
  arrange: 'crests' | 'valleys' | 'mixed'
}

export interface LabLayer {
  side: 'over' | 'under'
  kind: 'fill' | 'stroke'
  f: EdgeCurve
}

const LAB_ROOM = 3

/** The Lab's motion headroom: 3% of the band, never under 3 px on a short band. */
const labHeadroom = (hpx: number) => Math.max(0.03, LAB_ROOM / hpx)

/** The Lab's `repairDepth`, with its pass that keeps a second same-side layer apart. */
function labRepairDepth(t: EdgeCurve, floor: number, other: EdgeCurve | null): EdgeCurve {
  const N = 360
  const fixes: { a: number; c: number; w: number }[] = []
  const get = (x: number) => t(x) + fixes.reduce((s, b) => s + b.a * bump(x, b.c, b.w, b.w), 0)
  const sample = () => Array.from({ length: N + 1 }, (_, i) => get(i / N))
  const o = other ? Array.from({ length: N + 1 }, (_, i) => other(i / N)) : null
  for (let pass = 0; pass < 10; pass++) {
    let changed = false
    if (o) {
      const v = sample()
      let run = 0
      for (let k = 0; k <= N; k++) {
        const close =
          (v[k] ?? 0) > floor &&
          (o[k] ?? 0) > floor &&
          Math.abs((v[k] ?? 0) - (o[k] ?? 0)) < floor * 0.9
        if (close) run++
        if ((!close || k === N) && run > 0) {
          const a = k - run
          const b = k - 1
          if (run > N * 0.02 || a === 0 || b === N) {
            fixes.push({ a: -floor * 1.6, c: (a + b) / 2 / N, w: Math.max(0.04, (run / N) * 0.7) })
            changed = true
          }
          run = 0
        }
      }
      for (const [k, c] of [
        [0, 0],
        [N, 1],
      ] as const)
        if ((v[k] ?? 0) > 0 && (o[k] ?? 0) > 0 && Math.abs((v[k] ?? 0) - (o[k] ?? 0)) < 0.035) {
          fixes.push({ a: -0.05, c, w: 0.06 })
          changed = true
        }
    }
    const v = sample()
    for (const [k, c] of [
      [0, 0],
      [N, 1],
    ] as const)
      if ((v[k] ?? 0) <= 0 && (v[k] ?? 0) > -floor * 0.7) {
        fixes.push({ a: -floor * 0.9, c, w: 0.05 })
        changed = true
      }
    let i = 0
    while (i <= N) {
      if ((v[i] ?? 0) > 0 && (v[i] ?? 0) < floor * 1.2) {
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

/**
 * The Lab's `family()` for a band `hpx` px tall (without its drift tiles, which only motion reads). The Lab
 * generates for the band it is drawn at: this is the height-dependent output production deliberately does
 * not follow below 100 px (edge-layered.ts).
 */
export function labFamily(p: LabParams, hpx: number, flip: boolean) {
  const floor = Math.max(0.035, LAB_ROOM / hpx)
  const headroom = labHeadroom(hpx)
  const c1 = p.crest
  const w = p.width
  const wl = w * p.asym
  const wr = w
  const c2 = clamp(0.14, c1 >= 0.5 ? c1 - 0.6 : c1 + 0.6, 0.86)
  const shape = normalise(
    (x) => bump(x, c1, wl, wr) + p.second * bump(x, c2, w * 0.9 * p.asym, w * 0.9) + p.tilt * x,
  )
  const hairRoom = p.hairline ? p.sep * 0.45 : 0
  const roomAbove = (p.over ? p.sep * 0.7 : 0) + hairRoom + 0.06
  const roomBelow = p.under ? Math.max(p.sep * 0.75, 1.5 * (floor + headroom)) + 0.05 : 0.04
  const cutBot = 1 - roomBelow
  const A = p.amp * (cutBot - roomAbove)
  const cut0: EdgeCurve = (x) => cutBot - A * shape(x)
  const phases = {
    crests: ['crest', 'crest'],
    valleys: ['valley', 'valley'],
    mixed: ['crest', 'valley'],
  }[p.arrange]
  const depthFn = (
    k: number,
    phase: string | undefined,
    shift: number,
    ownAt: number,
    tmax: number,
    dive: boolean,
  ): EdgeCurve => {
    const base = (x: number) => (phase === 'valley' ? 1 - shape(x - shift) : shape(x - shift))
    const g = normalise(
      (x) => base(x) + p.own * bump(x, ownAt, 0.11, 0.15) + 0.18 * (k % 2 ? x : 1 - x),
    )
    if (dive) {
      const d = 0.3
      return (x) => (tmax * (g(x) - d)) / (1 - d)
    }
    const tmin = Math.max(floor * 1.35, tmax * (1 - p.vary) * 0.8)
    return (x) => tmin + (tmax - tmin) * g(x)
  }
  let layers: (LabLayer & { k?: number })[] = []
  const t1 = p.over >= 1 ? depthFn(0, phases[0], p.spread, (c1 + 0.38) % 1, p.sep, p.dive) : null
  if (t1) layers.push({ side: 'over', kind: 'fill', f: (x) => cut0(x) - t1(x), k: 0 })
  if (p.over >= 2) {
    const tm = p.sep * (0.5 + 0.45 * p.overlap)
    const t = depthFn(1, phases[1], -p.spread, (c1 + 0.7) % 1, tm, p.dive)
    layers.push({ side: 'over', kind: 'fill', f: (x) => cut0(x) - t(x), k: 1 })
  }
  if (p.under) {
    const t = depthFn(2, 'crest', p.spread * 0.6, (c1 + 0.55) % 1, p.sep * 0.75, p.dive)
    layers.push({ side: 'under', kind: 'fill', f: (x) => cut0(x) + t(x), k: 2 })
  }
  if (p.hairline) {
    const g = depthFn(3, 'valley', -p.spread * 0.5, (c1 + 0.2) % 1, 1, false)
    layers.push({
      side: 'over',
      kind: 'stroke',
      f: (x) => cut0(x) - Math.max(0, t1 ? t1(x) : 0) - hairRoom * (0.3 + 0.7 * g(x)),
    })
  }
  layers = [...layers]
  let lo = Infinity
  let hi = -Infinity
  for (const f of [cut0, ...layers.map((l) => l.f)])
    for (let i = 0; i <= 200; i++) {
      const y = f(i / 200)
      lo = Math.min(lo, y)
      hi = Math.max(hi, y)
    }
  const top = 0.1
  const bottom = 0.97
  const span = hi - lo
  const target = bottom - top
  const fitY: EdgeCurve =
    span > target
      ? (y) => top + ((y - lo) * target) / span
      : lo < top
        ? (y) => y + (top - lo)
        : hi > bottom
          ? (y) => y - (hi - bottom)
          : (y) => y
  const cutF: EdgeCurve = (x) => fitY(cut0(x))
  let firstOver: EdgeCurve | null = null
  const fixed = layers.map((l) => {
    if (l.kind !== 'fill') return { ...l, f: (x: number) => fitY(l.f(x)) }
    const sign = l.side === 'over' ? 1 : -1
    const depth = labRepairDepth(
      (x) => sign * (cutF(x) - fitY(l.f(x))),
      floor + headroom,
      l.side === 'over' ? firstOver : null,
    )
    if (l.side === 'over' && !firstOver) firstOver = depth
    return { ...l, f: (x: number) => cutF(x) - sign * depth(x) }
  })
  const F = (f: EdgeCurve) => (flip ? (x: number) => f(1 - x) : f)
  return { cut: F(cutF), layers: fixed.map((l) => ({ ...l, f: F(l.f) })) }
}

/** The Lab's Still water, at its standard steps (its sliders' values), for `labFamily`. */
export const LAB_STILL_WATER: LabParams = {
  crest: 0.556,
  amp: 0.6,
  asym: 1.6,
  width: 0.18,
  second: 0,
  tilt: 0.037,
  sep: 0.2,
  spread: 0.07,
  own: 0.18,
  vary: 0.65,
  dive: true,
  overlap: 0.3,
  over: 1,
  under: false,
  hairline: false,
  arrange: 'crests',
}

// ---------------------------------------------------------------------------------------------------------
// The production validator.
// ---------------------------------------------------------------------------------------------------------

/** Samples across the width, as the Lab's validator and Stage 3A section 6 read them. */
export const SAMPLES = 720

/** The visible floor of a decorative fill, as a share of the band: 3.5%, and never under 3 px. */
export const floorOf = (bandPx: number) => Math.max(0.035, 3 / bandPx)

/** The steepest a line may run at any width, in px per px. */
export const MAX_SLOPE = 1.2

/** A layer must clear 3 px over at least this share of the width, after the band clips it. */
export const MIN_PRESENCE = 0.1

/**
 * Two fills on one side of the cut must each stand apart from the other: there is somewhere they alone reach
 * 3 px beyond the other, over at least this share of the width. Presence (3 px from the CUT) cannot tell two
 * nested fills from two layers: a fill that always sits inside the other clears it everywhere and still adds
 * nothing but a slightly darker strip.
 */
export const MIN_SEPARATION = 0.1

export interface SampledLayer {
  side: 'over' | 'under'
  /** y at each sample, in band units. */
  y: number[]
  /** How far the layer shows from the cut, clipped to the band: 0 where hidden. */
  depth: number[]
}

export interface SampledGeometry {
  cut: number[]
  layers: SampledLayer[]
}

/** A geometry read once at `SAMPLES + 1` points, so every band height is checked against the same numbers. */
export function sample(geometry: LayeredGeometry): SampledGeometry {
  const xs = Array.from({ length: SAMPLES + 1 }, (_, i) => i / SAMPLES)
  const cut = xs.map(geometry.cut)
  return {
    cut,
    layers: geometry.layers.map((layer) => {
      const y = xs.map(layer.line)
      const depth = y.map((value, i) => {
        const at = cut[i] ?? 0
        // Clipped to the band: an over layer shows from its line (no higher than the band's top) to the cut.
        return layer.side === 'over'
          ? Math.max(0, at - Math.max(0, value))
          : Math.max(0, Math.min(1, value) - at)
      })
      return { side: layer.side, y, depth }
    }),
  }
}

/** The steepest line in band units (|dy| per sample step, scaled to the whole width): cut everywhere, fills where shown. */
export function bandSlope(sampled: SampledGeometry): number {
  let steepest = 0
  const step = (values: number[], shows: (i: number) => boolean) => {
    for (let i = 0; i < SAMPLES; i++)
      if (shows(i) || shows(i + 1))
        steepest = Math.max(steepest, Math.abs((values[i + 1] ?? 0) - (values[i] ?? 0)) * SAMPLES)
  }
  step(sampled.cut, () => true)
  for (const layer of sampled.layers) step(layer.y, (i) => (layer.depth[i] ?? 0) > 0)
  return steepest
}

/** The slope in px per px of a band `bandPx` tall at a viewport `widthPx` wide. */
export const slopeAt = (band: number, bandPx: number, widthPx: number) => (band * bandPx) / widthPx

/** The share of the width over which a layer shows at least 3 px. */
export function presenceOf(layer: SampledLayer, bandPx: number): number {
  let shown = 0
  for (const depth of layer.depth) if (depth * bandPx >= 3) shown++
  return shown / (SAMPLES + 1)
}

/**
 * How two fills on the same side of the cut divide the band, as shares of the width, at a band `bandPx` tall:
 * where the first alone reaches 3 px beyond the second, where the second alone does, and where both show 3 px
 * (the overlap, a third tone). Depths are clipped to the band, as they paint.
 */
export function separationShares(a: SampledLayer, b: SampledLayer, bandPx: number) {
  let onlyA = 0
  let onlyB = 0
  let both = 0
  for (let i = 0; i <= SAMPLES; i++) {
    const da = (a.depth[i] ?? 0) * bandPx
    const db = (b.depth[i] ?? 0) * bandPx
    if (da - db >= 3) onlyA++
    if (db - da >= 3) onlyB++
    if (Math.min(da, db) >= 3) both++
  }
  const n = SAMPLES + 1
  return { onlyA: onlyA / n, onlyB: onlyB / n, both: both / n }
}

/**
 * Everything the contract checks that does not depend on width, for a band `bandPx` tall: slivers, edge
 * wedges, long tapers, containment, edge pinches, two same-side layers running together or crossing too
 * often, and presence. Returns the failures; an empty array is a pass. (Slope depends on width: `slopeAt`.)
 */
export function validate(sampled: SampledGeometry, bandPx: number): string[] {
  const failures: string[] = []
  const N = SAMPLES
  const floor = floorOf(bandPx)
  sampled.layers.forEach((layer, index) => {
    const label = `${layer.side} layer ${String(index + 1)}`
    // Containment: an over layer above the top of the band, or an under one below its bottom.
    let flat = 0
    for (const y of layer.y)
      if ((layer.side === 'over' && y < 0.006) || (layer.side === 'under' && y > 0.994)) flat++
    if (flat > N * 0.01) failures.push(`${label}: pressed flat against the band`)
    // Slivers, wedges and tapers, on the raw (unclipped) depth, as the Lab reads them.
    const v = layer.y.map((y, i) =>
      layer.side === 'over' ? (sampled.cut[i] ?? 0) - y : y - (sampled.cut[i] ?? 0),
    )
    let i = 0
    while (i <= N) {
      if ((v[i] ?? 0) > 0 && (v[i] ?? 0) < floor) {
        let j = i
        while (j + 1 <= N && (v[j + 1] ?? 0) > 0 && (v[j + 1] ?? 0) < floor) j++
        const len = j - i + 1
        const leftZero = i > 0 && (v[i - 1] ?? 0) <= 0
        const rightZero = j < N && (v[j + 1] ?? 0) <= 0
        if (i === 0 || j === N) failures.push(`${label}: thins out at the edge`)
        else if (leftZero || rightZero) {
          if (len > N * 0.06) failures.push(`${label}: long taper (${String(len)} samples)`)
        } else failures.push(`${label}: accidental sliver`)
        i = j + 1
      } else i++
    }
    const presence = presenceOf(layer, bandPx)
    if (presence < MIN_PRESENCE)
      failures.push(`${label}: clears 3 px over only ${(presence * 100).toFixed(1)}% of the width`)
  })
  // Edge pinch: the cut and any showing layer, or two showing layers, end within 0.025 of each other.
  for (const at of [0, N]) {
    const lines = [{ y: sampled.cut[at] ?? 0 }]
    for (const layer of sampled.layers) {
      // A layer counts while it shows, or is a hair's breadth behind the cut (as the Lab reads it).
      const raw =
        layer.side === 'over'
          ? (sampled.cut[at] ?? 0) - (layer.y[at] ?? 0)
          : (layer.y[at] ?? 0) - (sampled.cut[at] ?? 0)
      if (raw > -0.5 * floor) lines.push({ y: layer.y[at] ?? 0 })
    }
    for (let a = 0; a < lines.length; a++)
      for (let b = a + 1; b < lines.length; b++)
        if (Math.abs((lines[a]?.y ?? 0) - (lines[b]?.y ?? 0)) < 0.025)
          failures.push(`lines meet at the ${at ? 'right' : 'left'} edge`)
  }
  // Two layers on one side: running together, or crossing too often.
  for (let a = 0; a < sampled.layers.length; a++)
    for (let b = a + 1; b < sampled.layers.length; b++) {
      const la = sampled.layers[a]
      const lb = sampled.layers[b]
      if (la?.side !== lb?.side || !la || !lb) continue
      let cross = 0
      let run = 0
      let longest = 0
      for (let i = 0; i <= N; i++) {
        const both = (la.depth[i] ?? 0) > floor && (lb.depth[i] ?? 0) > floor
        const sign = Math.sign((la.y[i] ?? 0) - (lb.y[i] ?? 0))
        if (i && sign !== Math.sign((la.y[i - 1] ?? 0) - (lb.y[i - 1] ?? 0)) && both) cross++
        if (both && Math.abs((la.y[i] ?? 0) - (lb.y[i] ?? 0)) < floor * 0.6) {
          run++
          longest = Math.max(longest, run)
        } else run = 0
      }
      if (longest > N * 0.04) failures.push('layers run together')
      if (cross > 4) failures.push(`layers cross ${String(cross)} times`)
      const shares = separationShares(la, lb, bandPx)
      if (shares.onlyA < MIN_SEPARATION || shares.onlyB < MIN_SEPARATION)
        failures.push(
          `layers ${String(a + 1)} and ${String(b + 1)} are not distinct: alone beyond the other over ${(shares.onlyA * 100).toFixed(1)}% and ${(shares.onlyB * 100).toFixed(1)}% of the width`,
        )
    }
  return failures
}
