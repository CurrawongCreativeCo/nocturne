import { describe, expect, it } from 'vitest'

import { bump, flipCurve, normalise, pathFromFunction } from './edge-crest'
import { edgeBackLine, edgeLine } from './section-edges'

const sine = (mean: number, amplitude: number, phase: number) => (x: number) =>
  mean + amplitude * Math.sin(2 * Math.PI * x + phase)
const WAVE_PHASE = 0.6 * Math.PI

describe('bump', () => {
  it('peaks at 1 on its centre and falls to 1/e one width away, each side its own width', () => {
    expect(bump(0.6, 0.6, 0.3, 0.1)).toBe(1)
    expect(bump(0.3, 0.6, 0.3, 0.1)).toBeCloseTo(Math.exp(-1), 12)
    expect(bump(0.7, 0.6, 0.3, 0.1)).toBeCloseTo(Math.exp(-1), 12)
    // Asymmetric: the same distance falls further on the narrow side.
    expect(bump(0.5, 0.6, 0.3, 0.1)).toBeGreaterThan(bump(0.7, 0.6, 0.3, 0.1))
  })
})

describe('normalise', () => {
  it('rescales a curve to run from exactly 0 to 1 across the band', () => {
    const scaled = normalise((x) => 3 + 2 * bump(x, 0.4, 0.2, 0.2))
    const ys = Array.from({ length: 401 }, (_, i) => scaled(i / 400))
    expect(Math.min(...ys)).toBe(0)
    expect(Math.max(...ys)).toBe(1)
  })

  it('makes a flat curve 0 rather than dividing by nothing', () => {
    expect(normalise(() => 0.4)(0.7)).toBe(0)
  })
})

describe('flipCurve', () => {
  it('mirrors left to right only when asked', () => {
    const curve = (x: number) => x * x
    expect(flipCurve(curve, true)(0.2)).toBeCloseTo(curve(0.8), 12)
    expect(flipCurve(curve, false)).toBe(curve)
  })
})

describe('pathFromFunction', () => {
  it('draws today’s waves byte for byte from the same sines: it is their method', () => {
    expect(pathFromFunction(sine(0.5, 0.38, WAVE_PHASE), 0, 1, 8)).toBe(edgeLine('wave'))
    expect(pathFromFunction(sine(0.42, 0.3, WAVE_PHASE), 0, 1, 8)).toBe(edgeLine('layered'))
    expect(pathFromFunction(sine(0.64, 0.3, WAVE_PHASE + 0.9), 0, 1, 8)).toBe(edgeBackLine())
  })

  it('runs from `from` to `to` in one cubic per step, through the curve at both ends', () => {
    const curve = (x: number) => 0.5 - 0.3 * bump(x, 0.6, 0.3, 0.2)
    const path = pathFromFunction(curve, -0.12, 1.12, 16)
    expect(path.match(/C/g)).toHaveLength(16)
    expect(path.startsWith(`M-0.12 ${String(Math.round(curve(-0.12) * 10_000) / 10_000)}C`)).toBe(
      true,
    )
    const numbers = path.match(/-?\d*\.?\d+/g)?.map(Number) ?? []
    expect(numbers.at(-2)).toBe(1.12)
    expect(numbers.at(-1)).toBe(Math.round(curve(1.12) * 10_000) / 10_000)
  })

  it('draws 64 steps unless told otherwise, rounded to 4 decimals, and the same every time', () => {
    const curve = (x: number) => 0.3 + 0.4 * bump(x, 0.45, 0.25, 0.18)
    const path = pathFromFunction(curve)
    expect(path.match(/C/g)).toHaveLength(64)
    expect(/\.\d{5,}/.exec(path)).toBeNull()
    expect(pathFromFunction(curve)).toBe(path)
  })
})
