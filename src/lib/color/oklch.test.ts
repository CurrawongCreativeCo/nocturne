import { describe, expect, it } from 'vitest'

import { hexToOklch, hexToRgb, oklchToHex, rgbToHex } from './oklch'

describe('hex and OKLCH conversion', () => {
  it('reads and writes hex', () => {
    expect(hexToRgb('#5F2BD4')).toEqual([95, 43, 212])
    expect(rgbToHex([95, 43, 212])).toBe('#5f2bd4')
    expect(rgbToHex([300, -4, 0.4])).toBe('#ff0000')
  })

  it('matches known OKLCH values', () => {
    const white = hexToOklch('#ffffff')
    expect(white.l).toBeCloseTo(1, 3)
    expect(white.c).toBeLessThan(0.001)
    const red = hexToOklch('#ff0000')
    expect(red.l).toBeCloseTo(0.628, 2)
    expect(red.c).toBeCloseTo(0.258, 2)
    expect(red.h).toBeCloseTo(29.2, 0)
  })

  it('round-trips colours', () => {
    for (const hex of [
      '#000000',
      '#ffffff',
      '#5f2bd4',
      '#eca72a',
      '#ffd400',
      '#123456',
      '#808080',
    ]) {
      expect(oklchToHex(hexToOklch(hex))).toBe(hex)
    }
  })

  it('pulls an out-of-gamut colour back by chroma, not by clipping', () => {
    const { h } = hexToOklch('#5f2bd4')
    const mapped = hexToOklch(oklchToHex({ l: 0.9, c: 0.4, h }))
    expect(mapped.l).toBeCloseTo(0.9, 1)
    expect(Math.abs(mapped.h - h)).toBeLessThan(4)
  })
})
