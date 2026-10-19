import { describe, expect, it } from 'vitest'

import { linkListParts, resolveDivider } from './divider-options'

const all = { profile: true, heading: false, social: true, socialsBelow: false }

describe('resolveDivider', () => {
  it('draws nothing while unset or None, or for a style never offered', () => {
    expect(resolveDivider(undefined)).toBeNull()
    expect(resolveDivider({ style: 'none', placements: ['afterProfile'] })).toBeNull()
    expect(resolveDivider({ style: 'zigzag' })).toBeNull()
  })

  it('goes after the profile, medium and in the line colour, until told otherwise', () => {
    expect(resolveDivider({ style: 'diamond' })).toEqual({
      style: 'diamond',
      width: 'medium',
      colour: undefined,
      placements: ['afterProfile'],
    })
    expect(
      resolveDivider({
        style: 'line',
        width: 'short',
        placements: ['belowSocial', 'bogus'],
        colour: { colour: 'highlight' },
      }),
    ).toMatchObject({
      width: 'short',
      placements: ['belowSocial'],
      colour: 'var(--color-highlight)',
    })
  })
})

describe('linkListParts', () => {
  it('is the original order with no dividers', () => {
    expect(linkListParts({ ...all, heading: true, placements: [] })).toEqual([
      'profile',
      'heading',
      'social',
      'links',
    ])
  })

  it('puts the profile divider straight under the profile, above a heading', () => {
    expect(linkListParts({ ...all, heading: true, placements: ['afterProfile'] })).toEqual([
      'profile',
      'divider',
      'heading',
      'social',
      'links',
    ])
  })

  it('surrounds the social icons, wherever they sit', () => {
    expect(linkListParts({ ...all, placements: ['aboveSocial', 'belowSocial'] })).toEqual([
      'profile',
      'divider',
      'social',
      'divider',
      'links',
    ])
    expect(
      linkListParts({ ...all, socialsBelow: true, placements: ['aboveSocial', 'belowSocial'] }),
    ).toEqual(['profile', 'links', 'divider', 'social'])
  })

  it('never draws two in a row, one first or last, or one for a missing part', () => {
    // After the profile and above the icons meet: one divider.
    expect(linkListParts({ ...all, placements: ['afterProfile', 'aboveSocial'] })).toEqual([
      'profile',
      'divider',
      'social',
      'links',
    ])
    // No profile: nothing to divide from, and the icons come first.
    expect(
      linkListParts({ ...all, profile: false, placements: ['afterProfile', 'aboveSocial'] }),
    ).toEqual(['social', 'links'])
    // No social icons: their dividers go too.
    expect(
      linkListParts({ ...all, social: false, placements: ['aboveSocial', 'belowSocial'] }),
    ).toEqual(['profile', 'links'])
  })
})
