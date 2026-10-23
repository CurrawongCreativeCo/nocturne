import { describe, expect, it } from 'vitest'

import { layeredSurface, surfaceColourCheck, surfaceTextContrast } from './surface-contrast'

describe('shared surface contrast', () => {
  it('layers a non-Link-list surface without needing card or label schema fields', () => {
    expect(
      layeredSurface(
        {
          background: { colour: 'custom', hex: '#123456' },
          backgroundStrength: 'medium',
          foreground: { colour: 'ink' },
        },
        {
          background: { colour: 'inherit' },
          backgroundStrength: 'unknown',
          foreground: { colour: 'custom', hex: '#ffffff' },
        },
      ),
    ).toEqual({
      background: { colour: 'custom', hex: '#123456' },
      backgroundStrength: 'medium',
      foreground: { colour: 'custom', hex: '#ffffff' },
    })
  })

  it('checks a background choice with inherited foreground and local strength', () => {
    const result = surfaceColourCheck({
      role: 'background',
      current: 'custom',
      hex: '#000000',
      inherited: { foreground: { colour: 'custom', hex: '#ffffff' } },
      own: { backgroundStrength: 'solid' },
      tone: 'surface',
      glass: null,
    })
    expect(result).toMatchObject({
      background: '#000000',
      foreground: '#ffffff',
      ratio: 21,
      pass: true,
    })
  })

  it('clearing an own background falls back to the parent background', () => {
    const result = surfaceColourCheck({
      role: 'background',
      current: 'inherit',
      inherited: {
        background: { colour: 'custom', hex: '#000000' },
        foreground: { colour: 'custom', hex: '#ffffff' },
      },
      own: {},
      tone: 'surface',
      glass: null,
    })
    expect(result).toMatchObject({ background: '#000000', pass: true })
  })

  it('checks a text choice on glass against the worst photograph', () => {
    const result = surfaceColourCheck({
      role: 'text',
      current: 'custom',
      hex: '#ffffff',
      inherited: { background: { colour: 'transparent' } },
      tone: 'surface',
      glass: 'medium',
    })
    expect(result).toMatchObject({ background: '#ffffff', ratio: 1, pass: false })
  })

  it('leaves unchanged surfaces and invalid text choices to their existing checks', () => {
    expect(
      surfaceTextContrast({ foreground: '#ffffff', surface: {}, tone: 'surface', glass: null }),
    ).toBeNull()
    expect(
      surfaceColourCheck({ role: 'text', current: 'inherit', inherited: {}, glass: null }),
    ).toBeNull()
  })
})
