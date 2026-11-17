import { describe, expect, it } from 'vitest'

import {
  countOverrides,
  describeSpacingCount,
  findSpacingOverrides,
  type SpacingSources,
} from './spacing-usage'

const section = (key: string, spacing: string | undefined, extra: object = {}) => ({
  _key: key,
  _type: 'testimonials',
  ...(spacing === undefined ? {} : { style: { _type: 'sectionStyle', spacing } }),
  ...extra,
})

const sources = (overrides: Partial<SpacingSources> = {}): SpacingSources => ({
  pages: [
    {
      _id: 'home',
      title: 'Home',
      pageBuilder: [
        section('a', 'compact', { title: 'Quotes' }),
        section('b', 'default'),
        section('c', undefined),
        section('d', 'spacious', { _type: 'pricingTable' }),
      ],
    },
    { _id: 'about', title: 'About', pageBuilder: [section('e', 'default')] },
  ],
  sharedSections: [{ _id: 'banner', title: 'Banner', section: section('f', 'compact') }],
  ...overrides,
})

describe('findSpacingOverrides', () => {
  it('counts Compact and Spacious, and not Default or an unset section, which follow Density', () => {
    const documents = findSpacingOverrides(sources())
    expect(documents.map((document) => document.id)).toEqual(['home', 'banner'])
    expect(documents[0]?.sections.map((item) => [item.key, item.spacing])).toEqual([
      ['a', 'compact'],
      ['d', 'spacious'],
    ])
    expect(countOverrides(documents)).toBe(3)
  })

  it('names a section by its title, or by its kind', () => {
    const [home] = findSpacingOverrides(sources())
    expect(home?.sections.map((item) => item.label)).toEqual(['Quotes', 'Pricing table'])
  })

  it('gives each section a Studio path to open it at', () => {
    const [home, banner] = findSpacingOverrides(sources())
    expect(home?.sections[0]?.path).toBe('pageBuilder[_key=="a"]')
    expect(banner).toMatchObject({ type: 'sharedSection', sections: [{ path: 'section' }] })
  })

  it('prefers the draft, which is what editors see', () => {
    const documents = findSpacingOverrides(
      sources({
        pages: [
          { _id: 'home', title: 'Home', pageBuilder: [section('a', 'compact')] },
          { _id: 'drafts.home', title: 'Home', pageBuilder: [section('a', 'default')] },
        ],
        sharedSections: [],
      }),
    )
    expect(documents).toEqual([])
  })

  it('copes with empty and malformed content', () => {
    expect(
      findSpacingOverrides({
        pages: [
          { _id: 'p', pageBuilder: null },
          { _id: 'q' },
          { _id: 'r', pageBuilder: [null, 3] },
        ],
        sharedSections: [{ _id: 's', section: 'nope' }, { _id: 't' }],
      }),
    ).toEqual([])
  })
})

describe('describeSpacingCount', () => {
  it('says how many, in the singular and plural, and when none', () => {
    expect(describeSpacingCount(0)).toContain('No section sets its own spacing')
    expect(describeSpacingCount(1)).toBe(
      '1 section sets its own spacing and keeps it whatever Density is.',
    )
    expect(describeSpacingCount(3)).toBe(
      '3 sections set their own spacing and keep it whatever Density is.',
    )
  })
})
