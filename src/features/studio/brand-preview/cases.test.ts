import { describe, expect, it } from 'vitest'

import { contrastRatio } from '@/lib/color/contrast'

import { brandPreviewCases } from './cases'

const byId = (id: string) => {
  const found = brandPreviewCases.find((item) => item.id === id)
  if (!found) throw new Error(`no case ${id}`)
  return found
}

describe('brand preview cases', () => {
  it('covers the four brands', () => {
    expect(brandPreviewCases.map((item) => item.id)).toEqual([
      'currawong',
      'green-cream',
      'partial',
      'low-contrast',
    ])
  })

  it('keeps the exact client fill for the green client and uses no Currawong colour', () => {
    const { brand } = byId('green-cream')
    expect(brand.source).toBe('client')
    expect(brand.light.accentFill).toBe('#2f5d3a')
    expect(brand.light.accentFill).not.toBe('#5f2bd4')
    expect(brand.dark.accentFill).not.toBe('#9f80e5')
  })

  it('lifts the yellow client’s text and focus colours, and says so', () => {
    const { brand } = byId('low-contrast')
    expect(brand.light.accentFill).toBe('#ffd400')
    for (const role of ['accentText', 'focus'] as const) {
      expect(contrastRatio(brand.light[role], brand.light.background)).toBeGreaterThanOrEqual(3)
    }
    expect(contrastRatio(brand.light.accentText, brand.light.background)).toBeGreaterThanOrEqual(
      4.5,
    )
    expect(brand.light.accentText).not.toBe('#ffd400')
    expect(brand.warnings.length).toBeGreaterThan(0)
  })
})
