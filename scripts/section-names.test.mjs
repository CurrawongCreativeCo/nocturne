import { describe, expect, it } from 'vitest'

import { parseSectionArgs, toSectionNames } from './section-names.mjs'

describe('toSectionNames', () => {
  it('gives the same names for any spelling', () => {
    const expected = {
      kebab: 'pricing-table',
      typeName: 'pricingTable',
      Component: 'PricingTable',
      title: 'Pricing table',
    }
    for (const input of [
      'pricing-table',
      'Pricing table',
      'pricingTable',
      'PricingTable',
      ' pricing_table ',
    ]) {
      expect(toSectionNames(input)).toEqual(expected)
    }
  })

  it('handles single words and digits', () => {
    expect(toSectionNames('faq2')).toEqual({
      kebab: 'faq2',
      typeName: 'faq2',
      Component: 'Faq2',
      title: 'Faq2',
    })
  })

  it('rejects names that cannot become identifiers', () => {
    expect(toSectionNames('')).toBeNull()
    expect(toSectionNames('---')).toBeNull()
    expect(toSectionNames('2col')).toBeNull()
  })
})

describe('parseSectionArgs', () => {
  it('reads a name without variants', () => {
    expect(parseSectionArgs(['pricing-table'])).toEqual({ input: 'pricing-table', variants: [] })
    expect(parseSectionArgs(['Pricing', 'table'])).toEqual({ input: 'Pricing table', variants: [] })
  })

  it('reads --variants as a separate argument or with =', () => {
    for (const argv of [
      ['pricing-table', '--variants', 'cards,full-bleed'],
      ['--variants=cards,full-bleed', 'pricing-table'],
    ]) {
      const { input, variants, error } = parseSectionArgs(argv)
      expect(error).toBeUndefined()
      expect(input).toBe('pricing-table')
      expect(variants.map((v) => v.kebab)).toEqual(['cards', 'full-bleed'])
      expect(variants[1].Component).toBe('FullBleed')
    }
  })

  it('rejects a bad list', () => {
    expect(parseSectionArgs(['x', '--variants']).error).toMatch(/needs a list/)
    expect(parseSectionArgs(['x', '--variants', 'a']).error).toMatch(/at least two/)
    expect(parseSectionArgs(['x', '--variants', 'a,b,c,d,e']).error).toMatch(/at most 4/)
    expect(parseSectionArgs(['x', '--variants', 'a,A']).error).toMatch(/twice/)
    expect(parseSectionArgs(['x', '--variants', 'a,index']).error).toMatch(/usable/)
    expect(parseSectionArgs(['x', '--variants', 'a,1b']).error).toMatch(/usable/)
    expect(parseSectionArgs(['x', '--nope']).error).toMatch(/Unknown option/)
  })
})
