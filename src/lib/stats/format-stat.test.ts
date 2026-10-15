import { describe, expect, it } from 'vitest'

import { formatStat, statDecimals, statWidthCh } from './format-stat'

describe('formatStat', () => {
  it('groups thousands the Australian way', () => {
    expect(formatStat({ value: 12500 })).toBe('12,500')
    expect(formatStat({ value: 1234567 })).toBe('1,234,567')
  })

  it('always shows the chosen number of decimals, so the width is steady', () => {
    expect(formatStat({ value: 4.9, decimals: 1 })).toBe('4.9')
    expect(formatStat({ value: 5, decimals: 1 })).toBe('5.0')
    expect(formatStat({ value: 4.987, decimals: 0 })).toBe('5')
    expect(formatStat({ value: 0.5, decimals: 2 })).toBe('0.50')
  })

  it('wraps the figure in its prefix and suffix', () => {
    expect(formatStat({ value: 1.2, decimals: 1, prefix: '$', suffix: 'm' })).toBe('$1.2m')
    expect(formatStat({ value: 98, suffix: '%' })).toBe('98%')
    expect(formatStat({ value: 500, suffix: '+', prefix: null })).toBe('500+')
  })

  it('formats a step on the way to the figure with the same rules', () => {
    expect(formatStat({ value: 12500, suffix: '+' }, 0)).toBe('0+')
    expect(formatStat({ value: 12500, suffix: '+' }, 6249.6)).toBe('6,250+')
  })

  it('handles zero and negative figures', () => {
    expect(formatStat({ value: 0 })).toBe('0')
    expect(formatStat({ value: -12.5, decimals: 1, suffix: '%' })).toBe('-12.5%')
  })
})

describe('statDecimals', () => {
  it('brings anything unusual into 0 to 3 whole places', () => {
    expect(statDecimals(undefined)).toBe(0)
    expect(statDecimals(null)).toBe(0)
    expect(statDecimals(NaN)).toBe(0)
    expect(statDecimals(-2)).toBe(0)
    expect(statDecimals(1.6)).toBe(2)
    expect(statDecimals(9)).toBe(3)
  })
})

describe('statWidthCh', () => {
  it('is the length of the final text', () => {
    expect(statWidthCh({ value: 12500, suffix: '+' })).toBe('12,500+'.length)
  })
})
