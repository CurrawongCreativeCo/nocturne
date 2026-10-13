import { describe, expect, it } from 'vitest'

import { formatInterval, formatPrice } from './format-price'

describe('formatPrice', () => {
  it('converts the smallest unit and drops empty cents', () => {
    expect(formatPrice({ amount: 1900, currency: 'usd' })).toBe('$19')
    expect(formatPrice({ amount: 1950, currency: 'usd' })).toBe('$19.50')
    expect(formatPrice({ amount: 0, currency: 'usd' })).toBe('$0')
  })

  it('accepts the code in any case and follows the locale', () => {
    expect(formatPrice({ amount: 19000, currency: 'EUR', locale: 'en' })).toBe('€190')
    expect(formatPrice({ amount: 19000, currency: 'eur', locale: 'de-DE' })).toMatch(/^190\s€$/)
  })

  it('does not divide zero-decimal currencies', () => {
    expect(formatPrice({ amount: 5000, currency: 'jpy' })).toBe('¥5,000')
  })

  it('divides three-decimal currencies by 1000', () => {
    expect(formatPrice({ amount: 1500, currency: 'kwd' })).toMatch(/1\.5/)
  })

  it('counts ISK in hundredths, as Stripe does', () => {
    expect(formatPrice({ amount: 500_000, currency: 'isk' })).toMatch(/5,000/)
  })
})

describe('formatInterval', () => {
  it('names the period', () => {
    expect(formatInterval('month', 1)).toBe('per month')
    expect(formatInterval('year')).toBe('per year')
    expect(formatInterval('month', 3)).toBe('every 3 months')
    expect(formatInterval('week', 2)).toBe('every 2 weeks')
  })

  it('is empty for a one-time price', () => {
    expect(formatInterval(null)).toBe('')
    expect(formatInterval(undefined, 1)).toBe('')
  })
})
