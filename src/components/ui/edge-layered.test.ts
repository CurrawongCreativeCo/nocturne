import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
  GENERATED_EDGE_HEIGHT_BOUNDS,
  SECTION_EDGE_CRESTS,
  SECTION_EDGE_DEPTHS,
  SECTION_EDGE_PALETTES,
  SECTION_EDGE_STRENGTHS,
  type GeneratedEdgeScreen,
} from '@/lib/sanity/section-style-options'
import tokens from '@/styles/tokens.json'

import { pathFromFunction } from './edge-crest'
import {
  LAB_STILL_WATER,
  MAX_SLOPE,
  MIN_PRESENCE,
  SAMPLES,
  bandSlope,
  labFamily,
  presenceOf,
  sample,
  slopeAt,
  validate,
  type LabParams,
  type SampledGeometry,
} from './edge-geometry.test-utils'
import {
  LAYER_FLOOR,
  LAYER_HEADROOM,
  LAYER_SEGMENTS,
  layeredComposition,
  layeredGeometry,
  layeredGeometryOf,
  type LayeredGeometry,
} from './edge-layered'
import {
  BELOW_OPACITY,
  LAYERED_PRESETS,
  allowsLayerBelow,
  opacityOf,
  separationOf,
  type EdgeCrest,
  type EdgeDepth,
} from './edge-presets'
import type { ResolvedEdge } from './section-edges'
import { resolveEdge } from './section-style'

/**
 * The layered-edge generator and Still water (task 151, Slice 3). Every combination Studio can reach is
 * drawn here through the real resolver and checked against the production contract (Stage 3A section 6, with
 * the owner's Slice 3 decisions), at every band height the tokens and the custom bounds can produce.
 *
 * What the numbers rest on, so a reader can see what is proven and what is sampled:
 * - The geometry is a function of the stepped controls only. It reads no height (layeredGeometry takes none),
 *   so there are 30 shapes, not 30 per height. Everything that depends on the band is checked per height: the
 *   3 px floor, the presence rule, and the long-taper rule. Slope is linear in band height over width, so
 *   each screen's worst case is its tallest band at its narrowest width, and both are tested.
 * - Heights are not sampled sparsely: every integer from 40 to 160 and a quarter-px scan between are run,
 *   plus the token bands at every width from 320 to 2560.
 */

// ---------------------------------------------------------------------------------------------------------
// Inputs: every reachable combination, through the resolver
// ---------------------------------------------------------------------------------------------------------

const STILL = LAYERED_PRESETS['still-water']

/** A value a test relies on being there. */
function need<T>(value: T | undefined | null, what: string): T {
  if (value === undefined || value === null) throw new Error(`Missing ${what}`)
  return value
}

interface Combination {
  key: string
  edge: ResolvedEdge
}

const resolved = (style: Parameters<typeof resolveEdge>[0]): ResolvedEdge => {
  const edge = resolveEdge({ edge: 'still-water', ...style })
  if (!edge) throw new Error('Still water did not resolve')
  return edge
}

/** Every geometry Studio can reach, from the option lists, deduplicated by what is drawn. */
function reachable(): Combination[] {
  const found = new Map<string, Combination>()
  for (const crest of SECTION_EDGE_CRESTS)
    for (const depth of SECTION_EDGE_DEPTHS)
      for (const below of [false, true])
        for (const flip of [false, true]) {
          const edge = resolved({
            edgeCrest: crest,
            edgeDepth: depth,
            edgeLayerBelow: below,
            edgeFlip: flip,
          })
          const layered = edge.layered
          if (!layered) throw new Error('Still water resolved without its steps')
          const key = [
            layered.crest,
            layered.depth,
            layered.below ? 'below' : 'no-below',
            flip ? 'flip' : 'no-flip',
          ].join(' · ')
          found.set(key, { key, edge })
        }
  return [...found.values()]
}

const COMBINATIONS = reachable()
const geometryOf = (edge: ResolvedEdge): LayeredGeometry => {
  const geometry = layeredGeometryOf(edge)
  if (!geometry) throw new Error('no geometry')
  return geometry
}
const SAMPLED = COMBINATIONS.map((c) => ({ ...c, sampled: sample(geometryOf(c.edge)) }))

// ---------------------------------------------------------------------------------------------------------
// Every band height a page can draw
// ---------------------------------------------------------------------------------------------------------

/** A token size's height at a viewport width: its clamp(), read from tokens.json so it cannot drift from it. */
function tokenHeight(size: 'medium' | 'large', width: number): number {
  const clampText = tokens.edge[size]
  const match = /^clamp\(([\d.]+)rem, ([\d.]+)rem \+ ([\d.]+)vw, ([\d.]+)rem\)$/.exec(clampText)
  if (!match) throw new Error(`Unexpected token ${clampText}`)
  const number = (index: number) => Number(need(match[index], 'a token number'))
  const [min, base, slope, max] = [number(1), number(2), number(3), number(4)] as const
  return Math.min(max * 16, Math.max(min * 16, base * 16 + (slope / 100) * width))
}

/** The widths a screen size covers (phone below 768, tablet from 768, desktop from 1024) and the minimum one. */
const SCREEN_WIDTHS: Record<GeneratedEdgeScreen, [number, number]> = {
  mobile: [320, 767],
  tablet: [768, 1023],
  desktop: [1024, 2560],
}

const allWidths = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i)

/** Every integer height a custom field accepts, for each screen. */
const customHeights = (screen: GeneratedEdgeScreen) => {
  const { min, max } = GENERATED_EDGE_HEIGHT_BOUNDS[screen]
  return Array.from({ length: max - min + 1 }, (_, i) => min + i)
}

/** The distinct token heights over the supported widths, 320 to 2560 px, one px at a time. */
const TOKEN_BANDS = new Set<number>()
for (const size of ['medium', 'large'] as const)
  for (const width of allWidths(320, 2560)) TOKEN_BANDS.add(tokenHeight(size, width))

/** Every band height to test the width-independent rules at: tokens, integers 40-160, a quarter-px scan. */
const BANDS = [
  ...new Set([...TOKEN_BANDS, ...Array.from({ length: (160 - 40) * 4 + 1 }, (_, i) => 40 + i / 4)]),
].sort((a, b) => a - b)

// ---------------------------------------------------------------------------------------------------------
// The Lab, as reference
// ---------------------------------------------------------------------------------------------------------

/** The Lab's parameters for one combination of Still water's steps. */
function labParams(crest: EdgeCrest, depth: EdgeDepth, below: boolean): LabParams {
  return {
    ...LAB_STILL_WATER,
    crest: STILL.crests[crest],
    sep: separationOf(STILL, depth),
    under: below,
  }
}

/** Geo.path, copied from the Lab's source. */
const labPath = (f: (x: number) => number, steps = 64) => {
  const r = (n: number) => String(Math.round(n * 1e4) / 1e4)
  const slope = (x: number) => (f(x + 1e-4) - f(x - 1e-4)) / 2e-4
  const dx = 1 / steps
  let d = `M${r(0)} ${r(f(0))}`
  for (let i = 0; i < steps; i++) {
    const x0 = i * dx
    const x1 = x0 + dx
    d += `C${r(x0 + dx / 3)} ${r(f(x0) + (slope(x0) * dx) / 3)} ${r(x1 - dx / 3)} ${r(f(x1) - (slope(x1) * dx) / 3)} ${r(x1)} ${r(f(x1))}`
  }
  return d
}

/** Every raw combination of the steps, including the ones the resolver never draws (Shallow with a layer below). */
const RAW = SECTION_EDGE_CRESTS.flatMap((crest) =>
  SECTION_EDGE_DEPTHS.flatMap((depth) =>
    [false, true].flatMap((below) => [false, true].map((flip) => ({ crest, depth, below, flip }))),
  ),
)

describe('the generator against the Lab', () => {
  it('draws the Lab’s shape path for path wherever the Lab’s own constants are the generator’s: bands of 100 px and up', () => {
    for (const { crest, depth, below, flip } of RAW) {
      const ours = layeredGeometry({
        shape: STILL.shape,
        crest: STILL.crests[crest],
        separation: separationOf(STILL, depth),
        below,
        flip,
      })
      for (const band of [100, 134, 200, 320]) {
        const lab = labFamily(labParams(crest, depth, below), band, flip)
        // The same lines, the Lab's own Geo.path at the production segment count; the Lab draws 64.
        expect(pathFromFunction(ours.cut, 0, 1, LAYER_SEGMENTS)).toBe(
          labPath(lab.cut, LAYER_SEGMENTS),
        )
        expect(ours.layers.map((l) => pathFromFunction(l.line, 0, 1, LAYER_SEGMENTS))).toEqual(
          lab.layers.map((l) => labPath(l.f, LAYER_SEGMENTS)),
        )
        expect(pathFromFunction(ours.cut)).toBe(labPath(lab.cut, 64))
      }
    }
  })

  it('uses the floor and headroom the Lab reaches from 100 px up, so those are the constants', () => {
    // The Lab's floor is max(0.035, 3 / band) and its headroom max(0.03, 3 / band): both are constant from 100 px.
    expect(LAYER_FLOOR).toBe(Math.max(0.035, 3 / 100))
    expect(LAYER_HEADROOM).toBe(Math.max(0.03, 3 / 100))
  })

  /**
   * INTENDED DIFFERENCE. The Lab generates for the band it is drawn at, so on a phone band it draws something
   * else. Smallest input: Still water, Standard everything, no layer below, a 40 px band (Medium on a phone).
   * The Lab's repair threshold there is 1.2 x (0.075 + 0.075) = 0.18 of the band, nearly all of a Standard
   * layer's 0.2, so it repairs the layer away: no part of it is visible. Production draws the layer.
   */
  it('differs from the Lab on a phone band, where the Lab’s own output loses the upper layer', () => {
    const lab = labFamily(labParams('standard', 'standard', false), 40, false)
    const labLayer = lab.layers[0]
    let labVisible = 0
    for (let i = 0; i <= SAMPLES; i++) {
      const x = i / SAMPLES
      if (labLayer && (lab.cut(x) - labLayer.f(x)) * 40 >= 3) labVisible++
    }
    expect(labVisible / (SAMPLES + 1)).toBe(0)

    const ours = SAMPLED.find((c) => c.key === 'standard · standard · no-below · no-flip')
    const layer = ours?.sampled.layers[0]
    expect(layer && presenceOf(layer, 40)).toBeGreaterThan(MIN_PRESENCE)
  })

  it('draws the same shape at a phone band as at a desktop one: its geometry reads no height', () => {
    for (const { edge } of COMBINATIONS) {
      const at = (height: ResolvedEdge['height']) => layeredComposition({ ...edge, height })
      const tokens = [
        { kind: 'token', size: 'medium' },
        { kind: 'token', size: 'large' },
        { kind: 'custom', mobile: '40px', tablet: '120px', desktop: '160px' },
      ] as const
      for (const height of tokens) expect(at(height)).toEqual(at(tokens[0]))
    }
  })
})

// ---------------------------------------------------------------------------------------------------------
// The reachable set
// ---------------------------------------------------------------------------------------------------------

describe('the combinations Studio can reach', () => {
  it('are 30 shapes: 3 crests, 5 depth and layer-below pairs (no layer below at Shallow), 2 Flips', () => {
    expect(COMBINATIONS).toHaveLength(30)
    expect(new Set(COMBINATIONS.map((c) => c.key)).size).toBe(30)
    // Each is a distinct drawing.
    expect(
      new Set(
        COMBINATIONS.map(
          (c) =>
            layeredComposition(c.edge).cut +
            layeredComposition(c.edge)
              .parts.map((p) => p.line)
              .join(),
        ),
      ).size,
    ).toBe(30)
  })

  it('never reach a layer below at Shallow, however it is stored', () => {
    expect(allowsLayerBelow(STILL, 'shallow')).toBe(false)
    for (const crest of SECTION_EDGE_CRESTS) {
      const edge = resolved({ edgeCrest: crest, edgeDepth: 'shallow', edgeLayerBelow: true })
      expect(edge.layered?.below).toBe(false)
      expect(layeredComposition(edge).parts.map((p) => p.side)).toEqual(['over'])
    }
  })

  it('contain every combination the resolver can be given, stale or unknown values included', () => {
    const reached = new Set(COMBINATIONS.map((c) => c.key))
    for (const edgeCrest of [undefined, null, 'bogus', ...SECTION_EDGE_CRESTS])
      for (const edgeDepth of [undefined, null, 'bogus', ...SECTION_EDGE_DEPTHS])
        for (const edgeLayerBelow of [undefined, null, false, true])
          for (const edgeFlip of [undefined, false, true]) {
            const edge = resolved({ edgeCrest, edgeDepth, edgeLayerBelow, edgeFlip })
            const layered = edge.layered
            if (!layered) throw new Error('no steps')
            const key = [
              layered.crest,
              layered.depth,
              layered.below ? 'below' : 'no-below',
              edge.flip ? 'flip' : 'no-flip',
            ].join(' · ')
            expect(reached.has(key)).toBe(true)
          }
  })
})

// ---------------------------------------------------------------------------------------------------------
// The production contract
// ---------------------------------------------------------------------------------------------------------

describe('the production geometry contract', () => {
  it('has zero failures for every combination at every band from 40 to 160 px (quarter-px steps) and every token band', () => {
    const failures: string[] = []
    for (const { key, sampled } of SAMPLED)
      for (const band of BANDS) {
        for (const failure of validate(sampled, band))
          failures.push(`${key} @ ${String(band)} px: ${failure}`)
      }
    expect(failures).toEqual([])
  })

  it('holds at 40 px, the shortest band Studio allows: the repair keeps 1.2 x (floor + headroom) = 0.078 of the band, which is 3 px from 38.5 px up, and the contract first fails at 32 px', () => {
    expect((LAYER_FLOOR + LAYER_HEADROOM) * 1.2 * 40).toBeGreaterThanOrEqual(3)
    expect(3 / ((LAYER_FLOOR + LAYER_HEADROOM) * 1.2)).toBeCloseTo(38.46, 2)
    expect(40).toBe(Math.min(...Object.values(GENERATED_EDGE_HEIGHT_BOUNDS).map((b) => b.min)))
    // The margin is measured: going down, the first failure anywhere is a long taper at 32 px (probed in
    // quarter-px steps), so 40 px, the limit Studio enforces, sits 8 px above where the contract breaks.
    expect(
      SAMPLED.flatMap(({ sampled }) =>
        validate(sampled, 32).filter((f) => f.includes('long taper')),
      ).length,
    ).toBeGreaterThan(0)
    expect(SAMPLED.flatMap(({ sampled }) => validate(sampled, 33))).toEqual([])
  })

  it('fails the Lab’s own phone-band output, so the validator would have caught what the Lab draws at 40 px', () => {
    const lab = labFamily(labParams('standard', 'standard', false), 40, false)
    const geometry: LayeredGeometry = {
      cut: lab.cut,
      layers: lab.layers.map((l) => ({ side: l.side, line: l.f })),
    }
    expect(validate(sample(geometry), 40).join()).toMatch(/clears 3 px over only 0\.0%/)
  })

  it('shows why a layer below is not offered at Shallow: it would show over under 10% of a 40 px band', () => {
    const shallowBelow = RAW.filter((r) => r.depth === 'shallow' && r.below && !r.flip).map(
      ({ crest, depth, below, flip }) =>
        sample(
          layeredGeometry({
            shape: STILL.shape,
            crest: STILL.crests[crest],
            separation: separationOf(STILL, depth),
            below,
            flip,
          }),
        ),
    )
    const presences = shallowBelow.map((s) => presenceOf(need(s.layers[1], 'the lower layer'), 40))
    expect(Math.min(...presences)).toBeLessThan(MIN_PRESENCE)
    expect(shallowBelow.some((s) => validate(s, 40).length > 0)).toBe(true)
  })

  it('shows each enabled layer for at least 10% of the width at 3 px, at the shortest band, with the lower layer enabled at an allowed depth', () => {
    for (const { sampled } of SAMPLED)
      for (const layer of sampled.layers)
        expect(presenceOf(layer, 40)).toBeGreaterThanOrEqual(MIN_PRESENCE)
    // The lower layer, specifically, at both allowed depths.
    for (const depth of ['standard', 'deep'] as const)
      for (const crest of SECTION_EDGE_CRESTS) {
        const found = SAMPLED.find((c) => c.key === `${crest} · ${depth} · below · no-flip`)
        expect(found?.sampled.layers).toHaveLength(2)
        expect(
          presenceOf(need(found?.sampled.layers[1], 'the lower layer'), 40),
        ).toBeGreaterThanOrEqual(MIN_PRESENCE)
      }
  })

  it('keeps every line at or under 1.2 px per px at every width and band a page can draw', () => {
    const over: string[] = []
    for (const { key, sampled } of SAMPLED) {
      const slope = bandSlope(sampled)
      // Token bands at every width 320..2560 (they grow with the width, so no width is skipped).
      for (const size of ['medium', 'large'] as const)
        for (const width of allWidths(320, 2560)) {
          const s = slopeAt(slope, tokenHeight(size, width), width)
          if (s > MAX_SLOPE) over.push(`${key} · ${size} @ ${String(width)}: ${s.toFixed(3)}`)
        }
      // Custom heights: every integer the bounds allow, at the narrowest and widest width of the screen.
      for (const screen of ['mobile', 'tablet', 'desktop'] as const)
        for (const height of customHeights(screen))
          for (const width of SCREEN_WIDTHS[screen]) {
            const s = slopeAt(slope, height, width)
            if (s > MAX_SLOPE)
              over.push(`${key} · ${screen} ${String(height)} @ ${String(width)}: ${s.toFixed(3)}`)
          }
    }
    expect(over).toEqual([])
  })

  it('has real margin on slope: the steepest line leaves at least 20% at the tightest corner of each screen', () => {
    const slope = Math.max(...SAMPLED.map((c) => bandSlope(c.sampled)))
    for (const screen of ['mobile', 'tablet', 'desktop'] as const) {
      const { max } = GENERATED_EDGE_HEIGHT_BOUNDS[screen]
      expect(slopeAt(slope, max, SCREEN_WIDTHS[screen][0])).toBeLessThan(MAX_SLOPE * 0.8)
    }
    // Large at the narrowest supported width, 320 px.
    expect(slopeAt(slope, tokenHeight('large', 320), 320)).toBeLessThan(MAX_SLOPE * 0.8)
  })

  it('counts a fill’s slope only where it shows, and the cut everywhere', () => {
    // A fill's hidden stretch is behind the cut: bandSlope ignores it, so it cannot fail a combination.
    const sampled = need(SAMPLED[0], 'a combination').sampled
    const hidden = {
      ...sampled,
      layers: sampled.layers.map((l) => ({ ...l, depth: l.depth.map(() => 0) })),
    }
    expect(bandSlope(hidden)).toBeLessThanOrEqual(bandSlope(sampled))
    const cutOnly = Math.max(
      ...sampled.cut.slice(1).map((y, i) => Math.abs(y - (sampled.cut[i] ?? 0)) * SAMPLES),
    )
    expect(bandSlope(hidden)).toBeCloseTo(cutOnly, 12)
  })

  it('catches the failures it is written for (positive controls)', () => {
    const flat = (y: number) => Array.from({ length: SAMPLES + 1 }, () => y)
    const geometry = (layerY: number[], side: 'over' | 'under' = 'over'): SampledGeometry => {
      const cut = flat(0.5)
      return {
        cut,
        layers: [
          {
            side,
            y: layerY,
            depth: layerY.map((y) =>
              side === 'over'
                ? Math.max(0, 0.5 - Math.max(0, y))
                : Math.max(0, Math.min(1, y) - 0.5),
            ),
          },
        ],
      }
    }
    // A layer that never shows.
    expect(validate(geometry(flat(0.5)), 64).join()).toMatch(/clears 3 px over only 0\.0%/)
    // A layer 2 px deep over the whole width (under the 3 px floor): a sliver the whole way across, with no taper.
    expect(validate(geometry(flat(0.5 - 2 / 64)), 64).length).toBeGreaterThan(0)
    // A layer pressed against the top of the band.
    expect(validate(geometry(flat(0)), 64).join()).toMatch(/pressed flat/)
    // A layer that shows well over its floor passes.
    expect(validate(geometry(flat(0.2)), 64)).toEqual([])
    // The slope rule fires on a steep line.
    expect(slopeAt(7, 64, 320)).toBeGreaterThan(MAX_SLOPE)
  })
})

// ---------------------------------------------------------------------------------------------------------
// Flip, strength, palette
// ---------------------------------------------------------------------------------------------------------

describe('Flip, strength and palette', () => {
  it('Flip mirrors every line exactly', () => {
    for (const { edge } of COMBINATIONS.filter((c) => !c.edge.flip)) {
      const plain = geometryOf(edge)
      const flipped = geometryOf({ ...edge, flip: true })
      for (let i = 0; i <= 40; i++) {
        const x = i / 40
        expect(flipped.cut(x)).toBe(plain.cut(1 - x))
        for (const [k, layer] of flipped.layers.entries())
          expect(layer.line(x)).toBe(plain.layers[k]?.line(1 - x))
      }
    }
  })

  it('changes no shape: strength and palette only change paint', () => {
    const base = layeredComposition(resolved({ edgeLayerBelow: true }))
    for (const edgeStrength of SECTION_EDGE_STRENGTHS)
      for (const edgePalette of SECTION_EDGE_PALETTES) {
        const other = layeredComposition(
          resolved({ edgeLayerBelow: true, edgeStrength, edgePalette }),
        )
        expect(other.cut).toBe(base.cut)
        expect(other.parts.map((p) => p.line)).toEqual(base.parts.map((p) => p.line))
      }
  })

  it('draws each recipe’s roles, the upper layer at the strength and the lower at 85% of it, capped at 60%', () => {
    const expected = {
      tint: ['accent', 'accent'],
      ink: ['ink', 'accent'],
      highlight: ['highlight', 'accent-2'],
    } as const
    for (const palette of SECTION_EDGE_PALETTES)
      for (const [strength, factor] of [
        ['light', 0.7],
        ['standard', 1],
        ['strong', 1.4],
      ] as const) {
        const parts = layeredComposition(
          resolved({ edgeLayerBelow: true, edgePalette: palette, edgeStrength: strength }),
        ).parts
        expect(parts.map((p) => p.paint)).toEqual(expected[palette])
        const upper = Math.min(0.6, 0.16 * factor)
        expect(parts[0]?.opacity).toBeCloseTo(upper, 12)
        expect(parts[1]?.opacity).toBeCloseTo(upper * BELOW_OPACITY, 12)
        expect(opacityOf(STILL, strength)).toBeCloseTo(upper, 12)
      }
    // The cap holds for any preset: even Reef's 0.42 at Strong stays at 0.6.
    expect(Math.min(0.6, 0.42 * 1.4)).toBe(0.588)
  })

  it('separates the layers by 0.15, 0.2 and 0.25 of the band at the three depths', () => {
    const [shallow, standard, deep] = SECTION_EDGE_DEPTHS.map((d) => separationOf(STILL, d))
    expect(shallow).toBeCloseTo(0.15, 12)
    expect(standard).toBeCloseTo(0.2, 12)
    expect(deep).toBeCloseTo(0.25, 12)
  })

  it('draws the layer above first, then the layer below, each on its own side of the cut', () => {
    expect(layeredComposition(resolved({})).parts.map((p) => [p.kind, p.side])).toEqual([
      ['fill', 'over'],
    ])
    expect(
      layeredComposition(resolved({ edgeLayerBelow: true })).parts.map((p) => [p.kind, p.side]),
    ).toEqual([
      ['fill', 'over'],
      ['fill', 'under'],
    ])
  })
})

// ---------------------------------------------------------------------------------------------------------
// Segments
// ---------------------------------------------------------------------------------------------------------

/**
 * The largest vertical distance, in px, between a path's cubic Béziers and the curve they were drawn from, on a
 * band `bandPx` tall. A path is a function of x, so the vertical error is its error whatever the width: the
 * horizontal stretch scales both curves alike.
 */
function deviation(curve: (x: number) => number, steps: number, bandPx: number): number {
  const slope = (x: number) => (curve(x + 1e-4) - curve(x - 1e-4)) / 2e-4
  const dx = 1 / steps
  let worst = 0
  for (let i = 0; i < steps; i++) {
    const x0 = i * dx
    const x1 = x0 + dx
    const p = [
      x0,
      curve(x0),
      x0 + dx / 3,
      curve(x0) + (slope(x0) * dx) / 3,
      x1 - dx / 3,
      curve(x1) - (slope(x1) * dx) / 3,
      x1,
      curve(x1),
    ] as const
    for (let k = 0; k <= 20; k++) {
      const t = k / 20
      const u = 1 - t
      const bx = u * u * u * p[0] + 3 * u * u * t * p[2] + 3 * u * t * t * p[4] + t * t * t * p[6]
      const by = u * u * u * p[1] + 3 * u * u * t * p[3] + 3 * u * t * t * p[5] + t * t * t * p[7]
      worst = Math.max(worst, Math.abs(by - curve(bx)) * bandPx)
    }
  }
  return worst
}

describe('segments per line', () => {
  // The largest band any page can draw: the desktop custom maximum. (The Large token tops out at 144 px.)
  const LARGEST = GENERATED_EDGE_HEIGHT_BOUNDS.desktop.max
  const lines = COMBINATIONS.flatMap(({ edge }) => {
    const geometry = geometryOf(edge)
    return [geometry.cut, ...geometry.layers.map((l) => l.line)]
  })

  it('keep every line within 0.25 px of its curve on the tallest band, 160 px, and at 144 px as the Large token', () => {
    expect(LAYER_SEGMENTS).toBe(32)
    for (const band of [144, LARGEST])
      for (const line of lines) expect(deviation(line, LAYER_SEGMENTS, band)).toBeLessThan(0.25)
  })

  it('keep them within 0.1 px: the margin is about five times the bar', () => {
    for (const line of lines) expect(deviation(line, LAYER_SEGMENTS, LARGEST)).toBeLessThan(0.1)
  })

  it('are checked against a control: a handful of segments fails the same bar', () => {
    expect(Math.max(...lines.map((line) => deviation(line, 4, LARGEST)))).toBeGreaterThan(0.25)
  })
})

// ---------------------------------------------------------------------------------------------------------
// Frozen geometry
// ---------------------------------------------------------------------------------------------------------

const checksum = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 16)

describe('frozen geometry', () => {
  it('keeps the checksum of every Still water shape, so a later slice cannot change it unseen', () => {
    const sums: Record<string, string> = {}
    for (const { key, edge } of COMBINATIONS) {
      const { cut, parts } = layeredComposition(edge)
      sums[key] = checksum([cut, ...parts.map((p) => p.line)].join('|'))
    }
    expect(sums).toMatchSnapshot()
  })

  it('keeps the path bytes of the default shape and of the shape with a layer below, exactly', () => {
    expect({
      default: layeredComposition(resolved({})),
      below: layeredComposition(
        resolved({ edgeLayerBelow: true, edgeDepth: 'deep', edgeFlip: true }),
      ),
    }).toMatchSnapshot()
  })

  it('keeps the size of every edge: the bytes of its cut and its layers', () => {
    const sizes = COMBINATIONS.map(({ edge }) => {
      const { cut, parts } = layeredComposition(edge)
      return cut.length + parts.reduce((sum, p) => sum + p.line.length, 0)
    })
    // 32 segments a line, about 1.3 KB each: the largest edge (a cut and two layers) is under 4.5 KB.
    expect(Math.max(...sizes)).toBeLessThan(4_500)
  })
})
