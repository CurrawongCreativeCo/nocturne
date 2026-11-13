import { describe, expect, it } from 'vitest'

import { contourComposition, tideComposition } from './edge-fixed'
import type { EdgeHeight, ResolvedEdge } from './section-edges'

/**
 * The Divider Design Lab's own definitions, copied verbatim from its source (Geo.bump, Geo.path, Geo.flip,
 * contourCut, contourGap, tideFront, tideBack and its Tide and Contour compositions), so production is
 * compared with the Lab, not with itself.
 */
const Lab = (() => {
  const bump = (x: number, c: number, wl: number, wr: number) => {
    const w = x < c ? wl : wr
    const t = (x - c) / w
    return Math.exp(-t * t)
  }
  const path = (f: (x: number) => number, from = 0, to = 1, steps = 64) => {
    const r = (n: number) => String(Math.round(n * 1e4) / 1e4)
    const slope = (x: number) => (f(x + 1e-4) - f(x - 1e-4)) / 2e-4
    const dx = (to - from) / steps
    let d = `M${r(from)} ${r(f(from))}`
    for (let i = 0; i < steps; i++) {
      const x0 = from + i * dx
      const x1 = x0 + dx
      d += `C${r(x0 + dx / 3)} ${r(f(x0) + (slope(x0) * dx) / 3)} ${r(x1 - dx / 3)} ${r(f(x1) - (slope(x1) * dx) / 3)} ${r(x1)} ${r(f(x1))}`
    }
    return d
  }
  const flip = (f: (x: number) => number, on: boolean) => (on ? (x: number) => f(1 - x) : f)
  const crest = (pk: number, l: number, r: number) => (x: number) => bump(x, pk, l, r)
  const contourCut = (x: number) =>
    0.04 + (0.4 * (1 - Math.cos(Math.PI * x))) / 2 + 0.16 * Math.sin(Math.PI * x)
  const contourGap = (x: number) => 0.1 + 0.16 * x
  const tideFront = (x: number) => 0.82 - 0.7 * crest(0.66, 0.36, 0.2)(x)
  const tideBack = (x: number) => 0.94 - 0.6 * crest(0.72, 0.38, 0.22)(x)
  return {
    tide: (flipped: boolean, mode: 'small' | 'medium' | 'large' | 'custom') => {
      const tight = mode === 'large' || mode === 'custom'
      const back = tight
        ? (x: number) => tideFront(x) + (tideBack(x) - tideFront(x)) * 0.6
        : tideBack
      return { cut: path(flip(tideFront, flipped)), back: path(flip(back, flipped)) }
    },
    contour: (flipped: boolean) => ({
      cut: path(flip(contourCut, flipped)),
      lines: [0, 1, 2].map((k) => path(flip((x) => contourCut(x) + k * contourGap(x), flipped))),
    }),
  }
})()

const HEIGHTS: Record<'small' | 'medium' | 'large' | 'custom', EdgeHeight> = {
  small: { kind: 'token', size: 'small' },
  medium: { kind: 'token', size: 'medium' },
  large: { kind: 'token', size: 'large' },
  custom: { kind: 'custom', mobile: '48px', tablet: '72px', desktop: '96px' },
}

const edge = (shape: 'tide' | 'contour', extra: Partial<ResolvedEdge> = {}): ResolvedEdge => ({
  shape,
  flip: false,
  invert: false,
  height: HEIGHTS.medium,
  accent: 'none',
  layer: 'accent-2',
  tideLayer: 'accent',
  lineColour: 'accent',
  ...extra,
})

describe('Tide v2', () => {
  it.each(Object.keys(HEIGHTS) as (keyof typeof HEIGHTS)[])(
    'draws the Lab’s cut and back crest at %s, with and without Flip',
    (mode) => {
      for (const flip of [false, true]) {
        const drawn = tideComposition(edge('tide', { flip, height: HEIGHTS[mode] }))
        const lab = Lab.tide(flip, mode)
        expect(drawn.cut).toBe(lab.cut)
        expect(drawn.parts.map((part) => part.line)).toEqual([lab.back])
      }
    },
  )

  it('keeps the original separation at Small and Medium, and 60% of it at Large and Custom', () => {
    const back = (mode: keyof typeof HEIGHTS) =>
      tideComposition(edge('tide', { height: HEIGHTS[mode] })).parts[0]?.line
    expect(back('small')).toBe(back('medium'))
    expect(back('large')).toBe(back('custom'))
    expect(back('large')).not.toBe(back('medium'))
    // The cut itself never changes with the height.
    expect(tideComposition(edge('tide', { height: HEIGHTS.large })).cut).toBe(
      tideComposition(edge('tide')).cut,
    )
  })

  it('draws its one crest below the cut: Primary 25% by default, Echo 40%, Secondary 25%', () => {
    const crest = (tideLayer: ResolvedEdge['tideLayer']) => {
      const [part, ...rest] = tideComposition(edge('tide', { tideLayer })).parts
      expect(rest).toEqual([])
      return part && { kind: part.kind, side: part.side, paint: part.paint, opacity: part.opacity }
    }
    expect(crest('accent')).toEqual({ kind: 'fill', side: 'under', paint: 'accent', opacity: 0.25 })
    expect(crest('echo')).toEqual({ kind: 'fill', side: 'under', paint: 'echo', opacity: 0.4 })
    expect(crest('accent-2')).toEqual({
      kind: 'fill',
      side: 'under',
      paint: 'accent-2',
      opacity: 0.25,
    })
  })
})

describe('Contour', () => {
  it('draws the Lab’s cut and three lines, the first along the cut, with and without Flip', () => {
    for (const flip of [false, true]) {
      const drawn = contourComposition(edge('contour', { flip }))
      const lab = Lab.contour(flip)
      expect(drawn.cut).toBe(lab.cut)
      expect(drawn.parts.map((part) => part.line)).toEqual(lab.lines)
      expect(drawn.parts[0]?.line).toBe(drawn.cut)
    }
  })

  it('draws three 1.5 px lines below the cut, fading 1, 0.65, 0.4, in Primary or the muted text colour', () => {
    for (const [lineColour, paint] of [
      ['accent', 'accent'],
      ['muted', 'ink-muted'],
    ] as const) {
      const parts = contourComposition(edge('contour', { lineColour })).parts
      expect(parts.map(({ kind, side, opacity }) => ({ kind, side, opacity }))).toEqual(
        [1, 0.65, 0.4].map((opacity) => ({ kind: 'stroke', side: 'under', opacity })),
      )
      for (const part of parts) {
        expect(part.paint).toBe(paint)
        expect(part.kind === 'stroke' && part.widthPx).toBe(1.5)
      }
    }
  })

  it('is the same at every height: its lines are shares of the band', () => {
    for (const height of Object.values(HEIGHTS))
      expect(contourComposition(edge('contour', { height }))).toEqual(
        contourComposition(edge('contour')),
      )
  })
})

describe('exact geometry, so a change to either shape is seen', () => {
  it('keeps every Tide and Contour path string', () => {
    const paths: Record<string, unknown> = {}
    for (const flip of [false, true]) {
      for (const mode of ['medium', 'large'] as const)
        paths[`tide · ${mode} · ${flip ? 'flip' : 'no flip'}`] = tideComposition(
          edge('tide', { flip, height: HEIGHTS[mode] }),
        )
      paths[`contour · ${flip ? 'flip' : 'no flip'}`] = contourComposition(
        edge('contour', { flip }),
      )
    }
    expect(paths).toMatchSnapshot()
  })
})
