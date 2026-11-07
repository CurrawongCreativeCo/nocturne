import { describe, expect, it } from 'vitest'

import { colorHex } from '@/config/tokens.generated'

import { composite } from './background-contrast'
import { contrastRatio } from './contrast'
import { markOpacityAt, safeMarkOpacity } from './mark-contrast'

describe('safeMarkOpacity', () => {
  it('leaves a faint mark alone when the text still reads', () => {
    expect(
      safeMarkOpacity({
        opacity: 0.1,
        marks: ['#000000'],
        surfaces: ['#ffffff'],
        foregrounds: ['#000000'],
      }),
    ).toBe(0.1)
  })

  it('lowers the opacity until the text is at the target, measured with the mark composited', () => {
    const inputs = { marks: ['#000000'], surfaces: ['#ffffff'], foregrounds: ['#767676'] }
    const safe = safeMarkOpacity({ opacity: 0.4, ...inputs })
    expect(safe).toBeLessThan(0.4)
    expect(contrastRatio('#767676', composite('#000000', '#ffffff', safe))).toBeGreaterThanOrEqual(
      Math.min(4.5, contrastRatio('#767676', '#ffffff')),
    )
  })

  it('never makes already failing text worse, and draws nothing if no opacity is safe', () => {
    expect(
      safeMarkOpacity({
        opacity: 0.2,
        marks: ['#000000'],
        surfaces: ['#ffffff'],
        foregrounds: ['#999999'],
      }),
    ).toBe(0)
  })

  it('may keep a mark that raises the contrast of failing text', () => {
    expect(
      safeMarkOpacity({
        opacity: 0.2,
        marks: ['#000000'],
        surfaces: ['#888888'],
        foregrounds: ['#ffffff'],
      }),
    ).toBe(0.2)
  })
})

describe('markOpacityAt', () => {
  it('measures a section against its tone, in the tone’s text colours', () => {
    expect(markOpacityAt({ opacity: 0.1, tone: 'default' })).toBeGreaterThan(0)
    expect(markOpacityAt({ opacity: 0.1, tone: 'inverse' })).toBeGreaterThan(0)
  })

  it('measures a card against its chosen background and its chosen text colours', () => {
    const plain = markOpacityAt({ opacity: 0.2, tone: 'default', levels: [{}] })
    const lowInk = markOpacityAt({
      opacity: 0.2,
      tone: 'default',
      colour: { colour: 'custom', hex: '#000000' },
      levels: [{ quote: { colour: { colour: 'custom', hex: '#777777' } } }],
    })
    expect(lowInk).toBeLessThan(plain)
  })

  it('takes the item’s level over the section’s', () => {
    // Text that only just reads on white, under a dark mark: the item's white decides, not the section's grey.
    const text = { quote: { colour: { colour: 'custom', hex: '#6b6b6b' } } }
    const section = { background: { colour: 'custom', hex: '#d0d0d0' }, ...text }
    const item = { background: { colour: 'custom', hex: '#ffffff' } }
    const mark = { opacity: 0.1, colour: { colour: 'custom', hex: '#000000' } }
    const onSection = markOpacityAt({ ...mark, tone: 'default', levels: [section] })
    const onItem = markOpacityAt({ ...mark, tone: 'default', levels: [section, item] })
    expect(onSection).not.toBe(onItem)
  })

  it('treats a picture’s own colours as anything from black to white', () => {
    const tinted = markOpacityAt({
      opacity: 0.4,
      tone: 'default',
      colour: { colour: 'custom', hex: colorHex.surface },
    })
    expect(markOpacityAt({ opacity: 0.4, tone: 'default', ownColours: true })).toBeLessThanOrEqual(
      tinted,
    )
  })

  it('assumes the worst behind a picture, gradient or panel', () => {
    const open = markOpacityAt({ opacity: 0.2, tone: 'default' })
    const backdrop = markOpacityAt({ opacity: 0.2, tone: 'default', backdrop: true })
    expect(backdrop).toBeLessThanOrEqual(open)
  })
})
