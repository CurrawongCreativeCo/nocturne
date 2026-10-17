import { describe, expect, it } from 'vitest'

import { colorHex } from '@/config/tokens.generated'

import { defaultColourFor } from './default-colour'

describe('defaultColourFor', () => {
  it.each([
    ['primary', colorHex.accent],
    ['secondary', colorHex.accent2],
    ['highlight', colorHex.highlight],
    ['surface', colorHex.surface],
    ['surfaceAlt', colorHex.surfaceAlt],
    ['surfaceInverse', colorHex.surfaceInverse],
    ['ink', colorHex.ink],
    ['inkMuted', colorHex.inkMuted],
    ['line', colorHex.line],
  ])('returns the tokens.json colour for %s when nothing is set', (field, expected) => {
    expect(defaultColourFor(field, {})).toBe(expected)
    expect(defaultColourFor(field, null)).toBe(expected)
  })

  it('ignores the field’s own stored value', () => {
    expect(defaultColourFor('primary', { primary: '#0b6e4f' })).toBe(colorHex.accent)
  })

  it('follows the other settings, such as a dark appearance', () => {
    expect(defaultColourFor('surface', { appearance: 'dark' })).toBe(colorHex.surfaceInverse)
  })

  it('has no default for gradient stops or unknown fields', () => {
    expect(defaultColourFor(null, {})).toBeNull()
    expect(defaultColourFor('stops', {})).toBeNull()
    expect(defaultColourFor('toString', {})).toBeNull()
  })
})
