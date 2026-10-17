import { describe, expect, it } from 'vitest'

import { colorHex } from '@/config/tokens.generated'

import { defaultColour } from './default-colour'

describe('defaultColour', () => {
  it('returns the tokens.json colour for each field when nothing is set', () => {
    const expected = {
      primary: colorHex.accent,
      secondary: colorHex.accent2,
      highlight: colorHex.highlight,
      surface: colorHex.surface,
      surfaceAlt: colorHex.surfaceAlt,
      surfaceInverse: colorHex.surfaceInverse,
      ink: colorHex.ink,
      inkMuted: colorHex.inkMuted,
      line: colorHex.line,
    }
    for (const [field, hex] of Object.entries(expected)) {
      expect(defaultColour(field, undefined)).toBe(hex)
    }
  })

  it('ignores any value already stored in the field itself', () => {
    expect(defaultColour('primary', { primary: '#ff0000' })).toBe(colorHex.accent)
  })

  it('follows the other settings, such as a dark appearance', () => {
    expect(defaultColour('surface', { appearance: 'dark' })).toBe(colorHex.surfaceInverse)
    expect(defaultColour('ink', { appearance: 'dark' })).toBe(colorHex.inkInverse)
  })

  it('follows a chosen background for the colours derived from it', () => {
    expect(defaultColour('surfaceAlt', { surface: '#101010' })).not.toBe(colorHex.surfaceAlt)
  })

  it('returns null for fields that are not colour roles', () => {
    expect(defaultColour(null, {})).toBeNull()
    expect(defaultColour('gradients', {})).toBeNull()
  })
})
