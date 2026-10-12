import { describe, expect, it } from 'vitest'

import { toSectionNames } from './section-names.mjs'

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
