import { describe, expect, it } from 'vitest'

import { adjustLightnessForContrast, contrastRatio } from './contrast'
import { hexToOklch } from './oklch'

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for identical colours', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#336699', '#336699')).toBe(1)
  })

  it('does not depend on the argument order', () => {
    expect(contrastRatio('#3266e4', '#ffffff')).toBe(contrastRatio('#ffffff', '#3266e4'))
  })

  it('matches a published WCAG value (#767676 on white is 4.54:1)', () => {
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2)
  })
})

describe('adjustLightnessForContrast', () => {
  it('leaves a colour that already passes alone', () => {
    const result = adjustLightnessForContrast('#5f2bd4', '#f4efe6', 4.5)
    expect(result).toMatchObject({ hex: '#5f2bd4', adjusted: false })
  })

  it('darkens on a light background and lightens on a dark one, keeping the hue', () => {
    const onLight = adjustLightnessForContrast('#ffd400', '#ffffff', 4.5)
    const onDark = adjustLightnessForContrast('#1a1a8c', '#101013', 4.5)
    expect(onLight.adjusted && onDark.adjusted).toBe(true)
    expect(contrastRatio(onLight.hex, '#ffffff')).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(onDark.hex, '#101013')).toBeGreaterThanOrEqual(4.5)
    expect(hexToOklch(onLight.hex).l).toBeLessThan(hexToOklch('#ffd400').l)
    expect(hexToOklch(onDark.hex).l).toBeGreaterThan(hexToOklch('#1a1a8c').l)
    expect(Math.abs(hexToOklch(onLight.hex).h - hexToOklch('#ffd400').h)).toBeLessThan(6)
  })

  it('stops close to the threshold instead of jumping to black or white', () => {
    const { ratio } = adjustLightnessForContrast('#ffd400', '#ffffff', 3)
    expect(ratio).toBeGreaterThanOrEqual(3)
    expect(ratio).toBeLessThan(3.3)
  })
})
