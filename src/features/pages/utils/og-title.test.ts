import { describe, expect, it } from 'vitest'

import { ogTitleFontSize } from './og-title'

describe('ogTitleFontSize', () => {
  it('uses the largest size for short titles', () => {
    expect(ogTitleFontSize('About')).toBe(88)
    expect(ogTitleFontSize('a'.repeat(40))).toBe(88)
  })

  it('shrinks as the title grows', () => {
    const sizes = [41, 81, 121].map((length) => ogTitleFontSize('a'.repeat(length)))
    expect(sizes).toEqual([72, 60, 52])
  })

  it('ignores surrounding whitespace', () => {
    expect(ogTitleFontSize(`  ${'a'.repeat(40)}  `)).toBe(88)
  })
})
