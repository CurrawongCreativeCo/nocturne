import { describe, expect, it } from 'vitest'

import { chosenTextColours, worstCardTextContrast } from './card-contrast'
import { surfaceColourCheck } from './surface-contrast'

const CUSTOM = (hex: string) => ({ colour: 'custom', hex })

describe('the card contrast lookup, for any section, card or item', () => {
  it('collects each role’s chosen colour, the most specific level winning', () => {
    expect(
      chosenTextColours(
        { quote: { colour: CUSTOM('#111111') }, label: { colour: CUSTOM('#222222') } },
        { quote: { colour: CUSTOM('#333333') }, attribution: { colour: { colour: 'inherit' } } },
      ),
    ).toEqual([CUSTOM('#333333'), CUSTOM('#222222')])
  })

  it('says nothing when no level chooses a background', () => {
    expect(
      worstCardTextContrast({ levels: [{}], defaults: { quote: 'ink' }, tone: 'default' }),
    ).toBeNull()
  })

  it('judges a background by the worst of the text on it', () => {
    const surface = { background: CUSTOM('#ffffff') }
    const fine = worstCardTextContrast({
      levels: [surface],
      defaults: { quote: 'ink', label: 'muted' },
      tone: 'default',
    })
    const worse = worstCardTextContrast({
      levels: [{ ...surface, quote: { colour: CUSTOM('#bbbbbb') } }],
      defaults: { quote: 'ink', label: 'muted' },
      tone: 'default',
    })
    expect(fine?.ratio).toBeGreaterThan(4.5)
    expect(worse?.ratio).toBeLessThan(4.5)
  })

  it('takes the item’s background over the section’s', () => {
    const worst = worstCardTextContrast({
      levels: [{ background: CUSTOM('#000000') }, { background: CUSTOM('#ffffff') }],
      defaults: { quote: 'ink' },
      tone: 'default',
    })
    expect(worst?.background).toBe('#ffffff')
  })

  it('reads a role in the colour the family draws it in until one is chosen', () => {
    const surface = { background: CUSTOM('#89a6ec') }
    const defaults = { quote: 'ink', label: 'muted' } as const
    expect(
      worstCardTextContrast({ levels: [surface], defaults, tone: 'default' })?.ratio,
    ).toBeLessThan(4.5)
    const inked = { ...surface, label: { colour: { colour: 'ink' } } }
    expect(
      worstCardTextContrast({ levels: [inked], defaults, tone: 'default' })?.ratio,
    ).toBeGreaterThan(4.5)
  })

  it('a picker’s check includes the card’s other chosen text colours', () => {
    const check = surfaceColourCheck({
      role: 'background',
      current: 'custom',
      hex: '#ffffff',
      foregrounds: [CUSTOM('#bbbbbb')],
      tone: 'default',
      glass: null,
    })
    expect(check?.pass).toBe(false)
    expect(check?.foreground).toBe('#bbbbbb')
  })
})
