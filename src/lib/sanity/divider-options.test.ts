import { describe, expect, it } from 'vitest'

import { linkListParts, resolveDivider } from './divider-options'

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
