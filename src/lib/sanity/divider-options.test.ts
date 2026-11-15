import { describe, expect, it } from 'vitest'

import {
  DIVIDER_STYLES,
  DIVIDER_STYLE_TITLES,
  linkListParts,
  resolveDivider,
} from './divider-options'

const image = { asset: { _id: 'image-a-40x40-png' } }
const all = { profile: true, heading: false, social: true, socialsBelow: false }

describe('resolveDivider', () => {
  it('draws nothing while unset or None, or for a style never offered', () => {
    expect(resolveDivider(undefined)).toBeNull()
    expect(resolveDivider({ style: 'none', centre: 'text', text: 'Hi' })).toBeNull()
    expect(resolveDivider({ style: 'zigzag' })).toBeNull()
  })

  it('is a medium, thin rule in the line colour with nothing in the middle until told otherwise', () => {
    expect(resolveDivider({ style: 'line' })).toEqual({
      style: 'line',
      width: 'medium',
      thickness: 'thin',
      centre: null,
      centreSize: 'medium',
      lineColour: undefined,
      centreColour: undefined,
    })
  })

  it('holds words, an icon, a picture or a diamond in the middle, with separate colours', () => {
    expect(
      resolveDivider({
        style: 'fade',
        centre: 'text',
        text: 'Stay connected',
        textCase: 'uppercase',
        lineColour: { colour: 'highlight' },
        centreColour: { colour: 'custom', hex: '#c9a227' },
      }),
    ).toMatchObject({
      centre: { kind: 'text', text: 'Stay connected', textCase: 'uppercase' },
      lineColour: 'var(--color-highlight)',
      centreColour: '#c9a227',
    })
    expect(resolveDivider({ style: 'line', centre: 'icon', icon: 'sun' })?.centre).toEqual({
      kind: 'icon',
      icon: 'sun',
    })
    expect(resolveDivider({ style: 'line', centre: 'image', image })?.centre).toEqual({
      kind: 'image',
      image,
    })
    expect(resolveDivider({ style: 'line', centre: 'diamond' })?.centre).toEqual({
      kind: 'diamond',
    })
  })

  it('leaves the middle empty when its content is missing or not offered, and dots take none', () => {
    expect(resolveDivider({ style: 'line', centre: 'text', text: '   ' })?.centre).toBeNull()
    expect(resolveDivider({ style: 'line', centre: 'icon', icon: 'unicorn' })?.centre).toBeNull()
    expect(resolveDivider({ style: 'line', centre: 'image', image: null })?.centre).toBeNull()
    expect(resolveDivider({ style: 'dots', centre: 'diamond' })?.centre).toBeNull()
  })
})

describe('linkListParts', () => {
  it('is the original order with no dividers', () => {
    expect(linkListParts({ ...all, heading: true, dividers: [] })).toEqual([
      'profile',
      'heading',
      'social',
      'links',
    ])
  })

  it('puts the profile divider straight under the profile, above a heading', () => {
    expect(linkListParts({ ...all, heading: true, dividers: ['afterProfile'] })).toEqual([
      'profile',
      { divider: 'afterProfile' },
      'heading',
      'social',
      'links',
    ])
  })

  it('surrounds the social icons, wherever they sit, but never ends the section', () => {
    expect(linkListParts({ ...all, dividers: ['aboveSocial', 'belowSocial'] })).toEqual([
      'profile',
      { divider: 'aboveSocial' },
      'social',
      { divider: 'belowSocial' },
      'links',
    ])
    expect(
      linkListParts({ ...all, socialsBelow: true, dividers: ['aboveSocial', 'belowSocial'] }),
    ).toEqual(['profile', 'links', { divider: 'aboveSocial' }, 'social'])
  })

  it('keeps the later of two that meet, and drops one for a missing part', () => {
    // After the profile meets Above the icons: the icons' own divider ("Stay connected") stays.
    expect(linkListParts({ ...all, dividers: ['afterProfile', 'aboveSocial'] })).toEqual([
      'profile',
      { divider: 'aboveSocial' },
      'social',
      'links',
    ])
    expect(
      linkListParts({ ...all, profile: false, dividers: ['afterProfile', 'aboveSocial'] }),
    ).toEqual(['social', 'links'])
    expect(
      linkListParts({ ...all, social: false, dividers: ['aboveSocial', 'belowSocial'] }),
    ).toEqual(['profile', 'links'])
    // The categories' divider lives inside the profile, never in this order.
    expect(linkListParts({ ...all, dividers: ['afterCategories'] })).toEqual([
      'profile',
      'social',
      'links',
    ])
  })
})

describe('Double, Dotted line and Gradient (task 151, Slice 7)', () => {
  it('are new values after the stored ones: no stored key changes', () => {
    expect([...DIVIDER_STYLES]).toEqual([
      'none',
      'line',
      'fade',
      'dots',
      'double',
      'dotted',
      'gradient',
    ])
    expect(DIVIDER_STYLE_TITLES).toMatchObject({
      dots: 'Three dots',
      double: 'Double',
      dotted: 'Dotted line',
      gradient: 'Gradient',
    })
  })

  it.each(['double', 'dotted', 'gradient'] as const)(
    '%s resolves like a line: medium, thin, nothing in the middle until told otherwise',
    (style) => {
      expect(resolveDivider({ style })).toEqual({
        style,
        width: 'medium',
        thickness: 'thin',
        centre: null,
        centreSize: 'medium',
        lineColour: undefined,
        centreColour: undefined,
      })
    },
  )

  it('lets Double, Dotted line and Gradient hold every centre a Line holds, and Three dots none', () => {
    const centres = [
      { centre: 'diamond' },
      { centre: 'icon', icon: 'heart' },
      { centre: 'text', text: 'Stay connected' },
      { centre: 'image', image },
    ]
    for (const centre of centres) {
      const line = resolveDivider({ style: 'line', ...centre })
      expect(line?.centre).not.toBeNull()
      for (const style of ['double', 'dotted', 'gradient'] as const)
        expect(resolveDivider({ style, ...centre })?.centre, `${style} ${centre.centre}`).toEqual(
          line?.centre,
        )
      expect(resolveDivider({ style: 'dots', ...centre })?.centre).toBeNull()
    }
  })

  it('draws a line colour on Double and Dotted line as it does on a Line', () => {
    const lineColour = { colour: 'accent' }
    const expected = resolveDivider({ style: 'line', lineColour })?.lineColour
    expect(expected).toBeDefined()
    expect(resolveDivider({ style: 'double', lineColour })?.lineColour).toBe(expected)
    expect(resolveDivider({ style: 'dotted', lineColour })?.lineColour).toBe(expected)
  })

  it('ignores a line colour on Gradient, and does not remove it: the input is only read', () => {
    const input = Object.freeze({
      style: 'gradient',
      lineColour: Object.freeze({ colour: 'custom', hex: '#aa5500' }),
      centre: 'diamond',
      centreColour: Object.freeze({ colour: 'highlight' }),
    })
    const before = JSON.stringify(input)
    const resolved = resolveDivider(input)
    expect(resolved?.lineColour).toBeUndefined()
    // The middle keeps its own colour, as it does on any style.
    expect(resolved?.centreColour).toBeDefined()
    expect(JSON.stringify(input)).toBe(before)
    // Changing the style brings the stored colour back.
    expect(resolveDivider({ ...input, style: 'line' })?.lineColour).toBe('#aa5500')
  })

  it('still draws nothing for a style never offered, and None', () => {
    for (const style of ['wave', 'glow', 'dotted-line', 'Double', ''])
      expect(resolveDivider({ style }), style).toBeNull()
  })
})

describe('Finish and the Ornament centre (task 151, Slice 7)', () => {
  const stored = (style: string, finish?: string | null) => resolveDivider({ style, finish })

  it('resolves Glow only for Line, Double and Gradient', () => {
    for (const style of ['line', 'double', 'gradient'])
      expect(stored(style, 'glow')?.finish).toBe('glow')
    for (const style of ['fade', 'dots', 'dotted'])
      expect(stored(style, 'glow'), style).not.toHaveProperty('finish')
  })

  it('leaves the finish out for unset, null, Flat and unknown values, so the output is what it was', () => {
    for (const finish of [undefined, null, 'flat', 'sparkly', '', 'GLOW'])
      expect(stored('line', finish), String(finish)).toEqual(resolveDivider({ style: 'line' }))
    expect(stored('line', 'flat')).not.toHaveProperty('finish')
  })

  it('ignores a Glow stored for an unsupported style without changing anything else', () => {
    for (const style of ['fade', 'dots', 'dotted'])
      expect(stored(style, 'glow'), style).toEqual(resolveDivider({ style }))
  })

  it('keeps the centre independent of the finish', () => {
    const input = { style: 'line', centre: 'text', text: 'Hi', centreColour: { colour: 'accent' } }
    const glowing = resolveDivider({ ...input, finish: 'glow' })
    expect(glowing?.finish).toBe('glow')
    expect({ ...glowing, finish: undefined }).toEqual({
      ...resolveDivider(input),
      finish: undefined,
    })
  })

  it('resolves the Ornament centre for every style that takes a centre, with its size and colour', () => {
    for (const style of ['line', 'fade', 'double', 'dotted', 'gradient'])
      expect(resolveDivider({ style, centre: 'ornament' })?.centre).toEqual({ kind: 'ornament' })
    const resolved = resolveDivider({
      style: 'line',
      centre: 'ornament',
      centreSize: 'large',
      centreColour: { colour: 'highlight' },
    })
    expect(resolved?.centreSize).toBe('large')
    expect(resolved?.centreColour).toBe('var(--color-highlight)')
  })

  it('keeps Three dots centre-free, even with an Ornament stored', () => {
    expect(resolveDivider({ style: 'dots', centre: 'ornament' })?.centre).toBeNull()
  })
})
