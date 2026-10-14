import { describe, expect, it } from 'vitest'

import { contrastRatio } from './contrast'

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
