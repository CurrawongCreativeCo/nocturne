import { describe, expect, it } from 'vitest'

import { hasBusinessDetails } from './business-details'

describe('hasBusinessDetails', () => {
  it('treats a missing or empty document as nothing to show', () => {
    expect(hasBusinessDetails(null)).toBe(false)
    expect(hasBusinessDetails(undefined)).toBe(false)
    expect(hasBusinessDetails({})).toBe(false)
    expect(
      hasBusinessDetails({
        tradingName: '',
        address: { street: null },
        openingHours: [],
        socialLinks: [],
      }),
    ).toBe(false)
  })

  it('ignores fields that show nothing on their own', () => {
    expect(hasBusinessDetails({ businessType: 'Restaurant' })).toBe(false)
  })

  it.each([
    ['a trading name', { tradingName: 'Acme Plumbing' }],
    ['a phone number', { phone: '02 9999 9999' }],
    ['part of the address', { address: { postcode: '2000' } }],
    ['social links', { socialLinks: [{ url: 'https://example.com' }] }],
  ])('has details with %s', (_label, info) => {
    expect(hasBusinessDetails(info)).toBe(true)
  })
})
