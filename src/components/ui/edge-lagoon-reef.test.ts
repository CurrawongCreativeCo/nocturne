import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
  GENERATED_EDGE_HEIGHT_BOUNDS,
  SECTION_EDGE_CRESTS,
  SECTION_EDGE_DEPTHS,
  SECTION_EDGE_PALETTES,
  SECTION_EDGE_STRENGTHS,
  type GeneratedEdge,
  type GeneratedEdgeScreen,
} from '@/lib/sanity/section-style-options'
import tokens from '@/styles/tokens.json'

import { pathFromFunction } from './edge-crest'
import {
  MAX_SLOPE,
  MIN_PRESENCE,
  MIN_SEPARATION,
  SAMPLES,
  bandSlope,
  labFamily,
  presenceOf,
  sample,
  separationShares,
  slopeAt,
  validate,
  type LabParams,
  type SampledGeometry,
} from './edge-geometry.test-utils'
import {
  LAYER_SEGMENTS,
  layeredComposition,
  layeredGeometry,
  layeredGeometryOf,
  type LayeredGeometry,
} from './edge-layered'
import {
  BELOW_OPACITY,
  LAYERED_PRESETS,
  SECOND_OPACITY,
  opacityOf,
  separationOf,
} from './edge-presets'
import type { ResolvedEdge } from './section-edges'
import { resolveEdge } from './section-style'

/**
 * Lagoon and Reef (task 151, Slice 4): two more rows of the closed preset table, drawn by the same generator
 * that draws Still water. Studio reaches only Flip, strength and the colour recipes (crest position, depth and
 * the layer below are fixed by the row), so a shape has two geometries: the shape and its mirror. Every one is
 * drawn through the real resolver here and held to the Slice 3 contract unchanged (3 px over 10% of the
 * width, 1.2 px/px slope, no slivers) plus a separate same-side separation rule. Still water's bounds were
 * treated as candidates: they hold for both shapes (the numbers are in the margin tests below), so no row
 * narrows its height range.
 */

const NAMES = ['lagoon', 'reef'] as const

function need<T>(value: T | undefined | null, what: string): T {
  if (value === undefined || value === null) throw new Error(`Missing ${what}`)
  return value
}

const resolved = (
  edge: GeneratedEdge,
  style: Partial<NonNullable<Parameters<typeof resolveEdge>[0]>> = {},
): ResolvedEdge => {
  const result = resolveEdge({ edge, ...style })
  if (!result) throw new Error(`${edge} did not resolve`)
  return result
}

const geometryOf = (edge: ResolvedEdge): LayeredGeometry =>
  need(layeredGeometryOf(edge), 'a geometry')

// ---------------------------------------------------------------------------------------------------------
// Every combination Studio can reach, and the stale ones it cannot
// ---------------------------------------------------------------------------------------------------------

/**
 * Every raw input the resolver can be given for a shape: every step Studio has ever offered (including the
 * ones Still water offers and these shapes do not), the stored layer-below switch, and Flip. Deduplicated by
 * what is drawn.
 */
function reachable(edge: GeneratedEdge) {
  const found = new Map<string, ResolvedEdge>()
  for (const edgeCrest of [undefined, 'bogus', ...SECTION_EDGE_CRESTS])
    for (const edgeDepth of [undefined, 'bogus', ...SECTION_EDGE_DEPTHS])
      for (const edgeLayerBelow of [undefined, null, false, true])
        for (const edgeFlip of [undefined, false, true]) {
          const resolvedEdge = resolved(edge, { edgeCrest, edgeDepth, edgeLayerBelow, edgeFlip })
          const layered = need(resolvedEdge.layered, 'its steps')
          found.set(
            [layered.crest, layered.depth, layered.below, resolvedEdge.flip].join(' · '),
            resolvedEdge,
          )
        }
  return [...found.entries()].map(([key, value]) => ({ key, edge: value }))
}

const REACHED = Object.fromEntries(NAMES.map((name) => [name, reachable(name)])) as Record<
  (typeof NAMES)[number],
  ReturnType<typeof reachable>
>
const SAMPLED = NAMES.flatMap((name) =>
  REACHED[name].map(({ key, edge }) => ({
    name,
    key: `${name} · ${key}`,
    edge,
    sampled: sample(geometryOf(edge)),
  })),
)

describe('the combinations Studio can reach', () => {
  it('are two shapes each, the shape and its mirror: crest, depth and the layer below are fixed by the row', () => {
    expect(REACHED.lagoon.map((c) => c.key).sort()).toEqual([
      'standard · standard · false · false',
      'standard · standard · false · true',
    ])
    expect(REACHED.reef.map((c) => c.key).sort()).toEqual([
      'standard · standard · true · false',
      'standard · standard · true · true',
    ])
  })

  it('draw Reef’s layer below whatever is stored, and Lagoon never has one', () => {
    for (const stored of [undefined, null, false, true]) {
      expect(resolved('reef', { edgeLayerBelow: stored }).layered?.below).toBe(true)
      expect(resolved('lagoon', { edgeLayerBelow: stored }).layered?.below).toBe(false)
    }
  })

  it('draw a stored crest or depth that the shape does not offer as its own, without altering the stored value', () => {
    const stored = {
      edgeCrest: 'shifted',
      edgeDepth: 'shallow',
      edgeLayerBelow: true,
      edgeFlip: false,
    } as const
    const before = { ...stored }
    for (const name of NAMES) {
      const drawn = resolved(name, stored)
      const plain = resolved(name, {})
      expect(drawn.layered?.crest).toBe('standard')
      expect(drawn.layered?.depth).toBe('standard')
      expect(layeredComposition(drawn)).toEqual(layeredComposition(plain))
    }
    expect(stored).toEqual(before)
  })

  it('never offer Shallow with two upper layers, and Deep is not offered either: depth is Standard only', () => {
    for (const name of NAMES) {
      const preset = LAYERED_PRESETS[name]
      expect(preset.uppers).toBe(2)
      expect(preset.depthOptions).toEqual(['standard'])
      expect(preset.crestOptions).toEqual(['standard'])
    }
  })

  it('keep Flip, strength and the colour recipes open: three strengths, three recipes, two Flips', () => {
    for (const name of NAMES) {
      const seen = new Set<string>()
      for (const strength of SECTION_EDGE_STRENGTHS)
        for (const palette of SECTION_EDGE_PALETTES)
          for (const flip of [false, true]) {
            const edge = resolved(name, {
              edgeStrength: strength,
              edgePalette: palette,
              edgeFlip: flip,
            })
            expect(edge.layered?.strength).toBe(strength)
            expect(edge.layered?.palette).toBe(palette)
            seen.add([strength, palette, flip].join())
          }
      expect(seen.size).toBe(18)
    }
  })

  it('default to the shape’s own recipe and the Standard strength', () => {
    for (const name of NAMES) {
      const layered = resolved(name).layered
      expect(layered?.palette).toBe(LAYERED_PRESETS[name].defaultPalette)
      expect(layered?.strength).toBe('standard')
    }
  })
})

// ---------------------------------------------------------------------------------------------------------
// Every band height a page can draw
// ---------------------------------------------------------------------------------------------------------

function tokenHeight(size: 'medium' | 'large', width: number): number {
  const match = /^clamp\(([\d.]+)rem, ([\d.]+)rem \+ ([\d.]+)vw, ([\d.]+)rem\)$/.exec(
    tokens.edge[size],
  )
  if (!match) throw new Error(`Unexpected token ${tokens.edge[size]}`)
  const number = (index: number) => Number(need(match[index], 'a token number'))
  return Math.min(
    number(4) * 16,
    Math.max(number(1) * 16, number(2) * 16 + (number(3) / 100) * width),
  )
}

const SCREEN_WIDTHS: Record<GeneratedEdgeScreen, [number, number]> = {
  mobile: [320, 767],
  tablet: [768, 1023],
  desktop: [1024, 2560],
}
const allWidths = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i)
const customHeights = (screen: GeneratedEdgeScreen) => {
  const { min, max } = GENERATED_EDGE_HEIGHT_BOUNDS[screen]
  return Array.from({ length: max - min + 1 }, (_, i) => min + i)
}

const TOKEN_BANDS = new Set<number>()
for (const size of ['medium', 'large'] as const)
  for (const width of allWidths(320, 2560)) TOKEN_BANDS.add(tokenHeight(size, width))
const BANDS = [
  ...new Set([...TOKEN_BANDS, ...Array.from({ length: (160 - 40) * 4 + 1 }, (_, i) => 40 + i / 4)]),
].sort((a, b) => a - b)

describe('the production geometry contract, for Lagoon and Reef', () => {
  it('has zero failures for every reachable shape at every band from 40 to 160 px (quarter-px steps) and every token band', () => {
    const failures: string[] = []
    for (const { key, sampled } of SAMPLED)
      for (const band of BANDS)
        for (const failure of validate(sampled, band))
          failures.push(`${key} @ ${String(band)} px: ${failure}`)
    expect(failures).toEqual([])
  })

  it('keeps every line at or under 1.2 px per px: token bands at every width 320-2560, and every custom height at both ends of its screen', () => {
    const over: string[] = []
    for (const { key, sampled } of SAMPLED) {
      const slope = bandSlope(sampled)
      for (const size of ['medium', 'large'] as const)
        for (const width of allWidths(320, 2560)) {
          const s = slopeAt(slope, tokenHeight(size, width), width)
          if (s > MAX_SLOPE) over.push(`${key} · ${size} @ ${String(width)}: ${s.toFixed(3)}`)
        }
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

  it('keeps the bounds Still water has: no row narrows its heights, because no corner fails', () => {
    // Heights are a property of the screen, not the shape; the resolver clamps a generated shape to these.
    for (const name of NAMES) {
      const edge = resolved(name, {
        edgeHeightMobile: 20,
        edgeHeightTablet: 500,
        edgeHeightDesktop: 500,
      })
      expect(edge.height).toEqual({
        kind: 'custom',
        mobile: '40px',
        tablet: '120px',
        desktop: '160px',
      })
    }
    expect(GENERATED_EDGE_HEIGHT_BOUNDS).toEqual({
      mobile: { min: 40, max: 64 },
      tablet: { min: 40, max: 120 },
      desktop: { min: 40, max: 160 },
    })
  })

  it('has at least 20% of slope in hand at the tightest corner of each screen, and at Large on a 320 px phone', () => {
    for (const name of NAMES) {
      const slope = Math.max(
        ...SAMPLED.filter((c) => c.name === name).map((c) => bandSlope(c.sampled)),
      )
      for (const screen of ['mobile', 'tablet', 'desktop'] as const) {
        const { max } = GENERATED_EDGE_HEIGHT_BOUNDS[screen]
        expect(slopeAt(slope, max, SCREEN_WIDTHS[screen][0])).toBeLessThan(MAX_SLOPE * 0.8)
      }
      expect(slopeAt(slope, tokenHeight('large', 320), 320)).toBeLessThan(MAX_SLOPE * 0.8)
    }
  })

  it('holds with room to spare at the shortest band, 40 px: each layer clears 3 px over at least 15% of the width (the bar is 10%; Reef’s second layer is the tightest, about 17-19%)', () => {
    for (const { sampled } of SAMPLED)
      for (const layer of sampled.layers)
        expect(presenceOf(layer, 40)).toBeGreaterThanOrEqual(MIN_PRESENCE * 1.5)
  })

  it('first fails well under the shortest band Studio allows (a 25% margin on height)', () => {
    for (const { sampled } of SAMPLED) {
      let first = Infinity
      for (let band = 40; band >= 20; band -= 0.25)
        if (validate(sampled, band).length > 0) {
          first = band
          break
        }
      expect(first).toBeLessThan(40 * 0.8)
    }
  })

  it('draws the same shape at every height: its geometry reads no band', () => {
    for (const { edge } of SAMPLED) {
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
// The same-side separation rule
// ---------------------------------------------------------------------------------------------------------

describe('two layers on one side must read as two layers', () => {
  it('holds for each shape’s two upper layers at every band: each stands alone beyond the other over at least 10% of the width', () => {
    for (const { key, sampled } of SAMPLED) {
      const [first, second] = sampled.layers
      for (const band of BANDS) {
        const shares = separationShares(need(first, 'layer 1'), need(second, 'layer 2'), band)
        expect(shares.onlyA, `${key} @ ${String(band)}`).toBeGreaterThanOrEqual(MIN_SEPARATION)
        expect(shares.onlyB, `${key} @ ${String(band)}`).toBeGreaterThanOrEqual(MIN_SEPARATION)
      }
    }
  })

  it('has the least separation at the shortest band, and reports it', () => {
    const least = (name: (typeof NAMES)[number]) =>
      Math.min(
        ...SAMPLED.filter((c) => c.name === name).flatMap(({ sampled }) => {
          const [a, b] = sampled.layers
          const shares = separationShares(need(a, 'a'), need(b, 'b'), 40)
          return [shares.onlyA, shares.onlyB]
        }),
      )
    // Measured: Lagoon 26% (layer 2) and Reef 19% (layer 2) of the width at 40 px, against the 10% bar.
    expect(least('lagoon')).toBeGreaterThan(0.2)
    expect(least('reef')).toBeGreaterThan(0.15)
  })

  /**
   * THE REGRESSION. Two upper fills, the second nested inside the first everywhere: Lagoon's own shape with the
   * second layer's offset taken away (so it rides the first one's crest and never leaves it) and the valley
   * arrangement. Each fill clears the cut-relative 3 px / 10% presence rule at every band, and none of the
   * other checks (slivers, running together, crossings) fires. The one thing wrong is that the second fill
   * adds only a darker strip inside the first: it is never alone, so it does not read as a layer.
   */
  it('catches two nested fills that both pass the presence rule', () => {
    const lagoon = LAYERED_PRESETS.lagoon
    const nested = sample(
      layeredGeometry({
        shape: { ...lagoon.shape, arrange: 'valleys', spread: 0.02 },
        crest: lagoon.crests.standard,
        separation: separationOf(lagoon, 'standard'),
        uppers: 2,
        below: false,
        flip: false,
      }),
    )
    for (const band of [40, 64, 100, 160]) {
      for (const layer of nested.layers)
        expect(presenceOf(layer, band), `presence @ ${String(band)}`).toBeGreaterThanOrEqual(
          MIN_PRESENCE,
        )
      expect(validate(nested, band), `@ ${String(band)}`).toEqual([
        expect.stringMatching(/layers 1 and 2 are not distinct: .* and 0\.0% of the width/),
      ])
    }
  })

  it('catches the same thing on a hand-made pair, and passes a pair that trade places', () => {
    const flat = (y: number) => Array.from({ length: SAMPLES + 1 }, () => y)
    const fill = (y: number[]) => ({
      side: 'over' as const,
      y,
      depth: y.map((value) => Math.max(0, 0.7 - Math.max(0, value))),
    })
    const make = (a: number[], b: number[]): SampledGeometry => ({
      cut: flat(0.7),
      layers: [fill(a), fill(b)],
    })
    // The second reaches 75% as far as the first, everywhere: 0.45 and 0.5 clear 3 px of a 64 px band.
    const nested = make(flat(0.3), flat(0.4))
    expect(nested.layers.every((layer) => presenceOf(layer, 64) >= MIN_PRESENCE)).toBe(true)
    expect(validate(nested, 64)).toEqual([expect.stringMatching(/not distinct/)])
    // Trading places: the first reaches further on the left half, the second on the right.
    const left = Array.from({ length: SAMPLES + 1 }, (_, i) => (i < SAMPLES / 2 ? 0.3 : 0.45))
    const right = Array.from({ length: SAMPLES + 1 }, (_, i) => (i < SAMPLES / 2 ? 0.45 : 0.3))
    expect(validate(make(left, right), 64).filter((f) => f.includes('not distinct'))).toEqual([])
  })

  it('is not triggered by a single layer on a side: Still water is unaffected', () => {
    const still = resolved('still-water', { edgeLayerBelow: true })
    expect(validate(sample(geometryOf(still)), 40)).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------------------
// Against the Lab
// ---------------------------------------------------------------------------------------------------------

const LAB: Record<(typeof NAMES)[number], LabParams> = {
  lagoon: {
    crest: 0.76,
    amp: 0.62,
    asym: 1.22,
    width: 0.17,
    second: 0.9,
    tilt: 0.04,
    sep: 0.3,
    spread: 0.071,
    own: 0.3,
    vary: 0.6,
    dive: true,
    overlap: 0.8,
    over: 2,
    under: false,
    hairline: false,
    arrange: 'mixed',
  },
  reef: {
    crest: 0.472,
    amp: 0.68,
    asym: 1.375,
    width: 0.183,
    second: 0.55,
    tilt: -0.023,
    sep: 0.271,
    spread: 0.082,
    own: 0.309,
    vary: 0.6,
    dive: true,
    overlap: 0.594,
    over: 2,
    under: true,
    // The Lab's Reef has a hairline; this pass leaves it off, so this is the Lab's shape without it.
    hairline: false,
    arrange: 'mixed',
  },
}

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

describe('the presets against the Lab', () => {
  it('draw the Lab’s shape path for path at bands of 100 px and up (Reef: the Lab’s shape without its hairline)', () => {
    for (const name of NAMES)
      for (const flip of [false, true]) {
        const edge = resolved(name, { edgeFlip: flip })
        const ours = geometryOf(edge)
        for (const band of [100, 134, 200, 320]) {
          const lab = labFamily(LAB[name], band, flip)
          expect(pathFromFunction(ours.cut, 0, 1, LAYER_SEGMENTS)).toBe(
            labPath(lab.cut, LAYER_SEGMENTS),
          )
          expect(ours.layers.map((l) => pathFromFunction(l.line, 0, 1, LAYER_SEGMENTS))).toEqual(
            lab.layers.map((l) => labPath(l.f, LAYER_SEGMENTS)),
          )
        }
      }
  })

  it('differs from the Lab’s own Reef, with its hairline, in the room above the cut: the hairline’s room is what is left out', () => {
    const withHairline = labFamily({ ...LAB.reef, hairline: true }, 100, false)
    const without = labFamily(LAB.reef, 100, false)
    // With the hairline the Lab reserves room above the cut for it, so the cut sits lower and rises less.
    const rise = (family: { cut: (x: number) => number }) => {
      let low = 1
      let high = 0
      for (let i = 0; i <= 200; i++) {
        low = Math.min(low, family.cut(i / 200))
        high = Math.max(high, family.cut(i / 200))
      }
      return high - low
    }
    expect(rise(withHairline)).not.toBeCloseTo(rise(without), 3)
  })
})

// ---------------------------------------------------------------------------------------------------------
// Parts, paint and order
// ---------------------------------------------------------------------------------------------------------

describe('the parts of Lagoon and Reef', () => {
  it('draw Lagoon as two layers above the cut, the first under the second, and nothing below', () => {
    const { parts } = layeredComposition(resolved('lagoon'))
    expect(parts.map((p) => [p.kind, p.side])).toEqual([
      ['fill', 'over'],
      ['fill', 'over'],
    ])
    const base = opacityOf(LAYERED_PRESETS.lagoon, 'standard')
    expect(parts[0]?.opacity).toBeCloseTo(base, 12)
    expect(parts[1]?.opacity).toBeCloseTo(base * SECOND_OPACITY, 12)
    expect(parts.map((p) => (p.kind === 'fill' ? p.paint : ''))).toEqual(['accent-2', 'ink'])
  })

  it('draw Reef as two layers above the cut and one below it', () => {
    const { parts } = layeredComposition(resolved('reef'))
    expect(parts.map((p) => [p.kind, p.side])).toEqual([
      ['fill', 'over'],
      ['fill', 'over'],
      ['fill', 'under'],
    ])
    const base = opacityOf(LAYERED_PRESETS.reef, 'standard')
    expect(parts.map((p) => p.opacity)).toEqual([base, base * SECOND_OPACITY, base * BELOW_OPACITY])
    expect(parts.map((p) => (p.kind === 'fill' ? p.paint : ''))).toEqual([
      'accent-2',
      'accent',
      'accent',
    ])
  })

  it('keeps every opacity at or under the 60% cap, at the strongest strength', () => {
    for (const name of NAMES)
      for (const palette of SECTION_EDGE_PALETTES)
        for (const part of layeredComposition(
          resolved(name, { edgeStrength: 'strong', edgePalette: palette }),
        ).parts)
          expect(part.opacity).toBeLessThanOrEqual(0.6)
  })

  it('changes no shape with strength or colours, and Flip mirrors every line exactly', () => {
    for (const name of NAMES) {
      const plain = layeredComposition(resolved(name))
      const recoloured = layeredComposition(
        resolved(name, { edgeStrength: 'strong', edgePalette: 'highlight' }),
      )
      expect(recoloured.cut).toBe(plain.cut)
      expect(recoloured.parts.map((p) => p.line)).toEqual(plain.parts.map((p) => p.line))
      const g = geometryOf(resolved(name))
      const f = geometryOf(resolved(name, { edgeFlip: true }))
      for (let i = 0; i <= 40; i++) {
        const x = i / 40
        expect(f.cut(x)).toBeCloseTo(g.cut(1 - x), 12)
        g.layers.forEach((layer, k) => {
          expect(need(f.layers[k], 'a layer').line(x)).toBeCloseTo(layer.line(1 - x), 12)
        })
      }
    }
  })

  it('stay compact: Lagoon’s cut and two layers are under 4.5 KB, Reef’s cut and three layers under 6 KB', () => {
    const size = (name: (typeof NAMES)[number]) => {
      const { cut, parts } = layeredComposition(resolved(name))
      return cut.length + parts.reduce((sum, p) => sum + p.line.length, 0)
    }
    expect(size('lagoon')).toBeLessThan(4_500)
    expect(size('reef')).toBeLessThan(6_000)
  })
})

// ---------------------------------------------------------------------------------------------------------
// Frozen geometry
// ---------------------------------------------------------------------------------------------------------

describe('frozen geometry', () => {
  it('keeps the checksum of each Lagoon and Reef shape, so a later slice cannot change it unseen', () => {
    const checksum = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 16)
    const sums: Record<string, string> = {}
    for (const { key, edge } of SAMPLED) {
      const { cut, parts } = layeredComposition(edge)
      sums[key] = checksum([cut, ...parts.map((p) => p.line)].join('|'))
    }
    expect(sums).toMatchSnapshot()
  })
})
