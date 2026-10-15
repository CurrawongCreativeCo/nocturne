import { describe, expect, it } from 'vitest'

import { colorHex } from '@/config/tokens.generated'

import { CONTRAST_PAIRS, contrastRows, formatRatio, sizeRange } from './token-contrast'

describe('contrastRows', () => {
  it('measures every pair of the default tokens, and all of them pass', () => {
    const rows = contrastRows(colorHex)
    expect(rows).toHaveLength(CONTRAST_PAIRS.length)
    expect(rows.filter((row) => !row.pass).map((row) => row.id)).toEqual([])
  })

  it('asks 4.5 of text and 3 of UI parts', () => {
    const rows = contrastRows(colorHex)
    expect(rows.find((row) => row.id === 'ink-surface')?.required).toBe(4.5)
    expect(rows.find((row) => row.id === 'focus')?.required).toBe(3)
  })

  it('flags a palette that fails', () => {
    const rows = contrastRows({ ...colorHex, inkMuted: '#aaaaaa' })
    expect(rows.find((row) => row.id === 'muted-surface')?.pass).toBe(false)
  })

  it('skips a pair whose colour is missing', () => {
    expect(contrastRows({ ink: '#000000' })).toEqual([])
  })
})

describe('formatRatio', () => {
  it('cuts to two decimals instead of rounding up', () => {
    expect(formatRatio(21)).toBe('21.00:1')
    expect(formatRatio(4.496)).toBe('4.49:1')
    expect(formatRatio(4.5)).toBe('4.50:1')
  })
})

describe('sizeRange', () => {
  it('turns a fluid clamp into pixels', () => {
    expect(sizeRange('clamp(2.25rem, 9.375vw, 3.75rem)')).toBe('36–60 px')
  })
  it('shows a fixed size once', () => {
    expect(sizeRange('clamp(1rem, 1rem, 1rem)')).toBe('16 px')
  })
  it('leaves anything else alone', () => {
    expect(sizeRange('2rem')).toBe('2rem')
  })
})
