import { describe, expect, it } from 'vitest'

import { cardLabelHex, cardTextContrast, layeredCardSurface } from './card-contrast'

describe('cardTextContrast', () => {
  it('has nothing to say while the card keeps the layout’s own surface', () => {
    expect(
      cardTextContrast({ foreground: '#111111', surface: {}, tone: 'surface', glass: null }),
    ).toBeNull()
  })

  it('measures dark text on a solid deep teal card as failing, and light text as passing', () => {
    const surface = { background: { colour: 'custom', hex: '#0b4a4c' } }
    expect(
      cardTextContrast({ foreground: '#111827', surface, tone: 'surface', glass: null })?.ratio,
    ).toBeLessThan(4.5)
    expect(
      cardTextContrast({ foreground: '#ffffff', surface, tone: 'surface', glass: null })?.ratio,
    ).toBeGreaterThan(4.5)
  })

  it('measures glass over the worst photo, so transparent glass never passes on its own', () => {
    const result = cardTextContrast({
      foreground: '#111827',
      surface: { background: { colour: 'transparent' } },
      tone: 'surface',
      glass: 'medium',
    })
    expect(result?.ratio).toBeLessThan(4.5)
  })
})

describe('layeredCardSurface', () => {
  it('takes the card’s choice where it made one, else the list’s', () => {
    const surface = layeredCardSurface(
      { background: { colour: 'accent' }, backgroundStrength: 'medium' },
      { backgroundStrength: 'solid', label: { colour: { colour: 'inherit' } } },
    )
    expect(surface.background).toEqual({ colour: 'accent' })
    expect(surface.backgroundStrength).toBe('solid')
    expect(cardLabelHex(surface, 'surface')).toMatch(/^#|^oklch/)
  })
})
