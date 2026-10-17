import { describe, expect, it } from 'vitest'

import {
  featuredKey,
  groupLinks,
  headingLevels,
  isHidden,
  isLinkVisible,
  isScheduled,
  withUtm,
} from './link-list'

const NOW = Date.parse('2026-10-16T00:00:00Z')

describe('isLinkVisible (the scheduling filter)', () => {
  it('shows a link with no dates', () => {
    expect(isLinkVisible({}, NOW)).toBe(true)
    expect(isLinkVisible({ visibility: 'show' }, NOW)).toBe(true)
  })

  it('never shows a hidden link, whatever its dates say', () => {
    expect(isLinkVisible({ visibility: 'hide' }, NOW)).toBe(false)
    expect(isLinkVisible({ visibility: 'hide', showFrom: '2026-01-01T00:00:00Z' }, NOW)).toBe(false)
  })

  it('starts at show-from, inclusive', () => {
    expect(isLinkVisible({ showFrom: '2026-10-16T00:00:01Z' }, NOW)).toBe(false)
    expect(isLinkVisible({ showFrom: '2026-10-16T00:00:00Z' }, NOW)).toBe(true)
  })

  it('stops at show-until, exclusive', () => {
    expect(isLinkVisible({ showUntil: '2026-10-16T00:00:00Z' }, NOW)).toBe(false)
    expect(isLinkVisible({ showUntil: '2026-10-16T00:00:01Z' }, NOW)).toBe(true)
  })

  it('shows inside a window and hides before and after it', () => {
    const window = { showFrom: '2026-10-10T00:00:00Z', showUntil: '2026-10-20T00:00:00Z' }
    expect(isLinkVisible(window, Date.parse('2026-10-09T23:59:59Z'))).toBe(false)
    expect(isLinkVisible(window, NOW)).toBe(true)
    expect(isLinkVisible(window, Date.parse('2026-10-20T00:00:00Z'))).toBe(false)
  })

  it('leaves a side open when its date is missing or not a date', () => {
    expect(isLinkVisible({ showFrom: null, showUntil: null }, NOW)).toBe(true)
    expect(isLinkVisible({ showFrom: 'soon', showUntil: 'later' }, NOW)).toBe(true)
  })
})

describe('isHidden and isScheduled', () => {
  it('only the word "hide" hides', () => {
    expect(isHidden({ visibility: 'hide' })).toBe(true)
    expect(isHidden({ visibility: 'show' })).toBe(false)
    expect(isHidden({})).toBe(false)
  })

  it('a link is scheduled when it has either date', () => {
    expect(isScheduled({})).toBe(false)
    expect(isScheduled({ showFrom: '2026-10-10T00:00:00Z' })).toBe(true)
    expect(isScheduled({ showUntil: '2026-10-10T00:00:00Z' })).toBe(true)
  })
})

describe('featuredKey (at most one large link)', () => {
  it('picks the first featured link in the editor’s order', () => {
    const links = [{ _key: 'a' }, { _key: 'b', featured: true }, { _key: 'c', featured: true }]
    expect(featuredKey(links)).toBe('b')
  })

  it('skips a hidden featured link rather than showing nothing large', () => {
    const links = [
      { _key: 'a', featured: true, visibility: 'hide' },
      { _key: 'b', featured: true },
    ]
    expect(featuredKey(links)).toBe('b')
  })

  it('is undefined when nothing is featured', () => {
    expect(featuredKey([{ _key: 'a' }, { _key: 'b', featured: false }])).toBeUndefined()
    expect(featuredKey([])).toBeUndefined()
  })
})

describe('groupLinks', () => {
  it('keeps the editor’s order and gathers a repeated heading', () => {
    const groups = groupLinks([
      { id: 1 },
      { id: 2, group: 'Shop' },
      { id: 3, group: 'Follow' },
      { id: 4, group: 'Shop' },
    ])
    expect(groups.map((group) => group.heading)).toEqual([undefined, 'Shop', 'Follow'])
    expect(groups.map((group) => group.links.map((link) => link.id))).toEqual([[1], [2, 4], [3]])
  })

  it('puts a link with no group under the heading above it', () => {
    const groups = groupLinks([{ id: 1, group: 'Shop' }, { id: 2 }])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.links.map((link) => link.id)).toEqual([1, 2])
  })

  it('treats a blank heading as none', () => {
    expect(groupLinks([{ group: '   ' }])[0]?.heading).toBeUndefined()
  })

  it('is empty for no links', () => {
    expect(groupLinks([])).toEqual([])
  })
})

describe('withUtm', () => {
  it('adds the tags to a web address', () => {
    const url = withUtm('https://example.com/shop', { source: 'instagram', medium: 'bio' })
    expect(new URL(url).searchParams.get('utm_source')).toBe('instagram')
    expect(new URL(url).searchParams.get('utm_medium')).toBe('bio')
    expect(new URL(url).searchParams.has('utm_campaign')).toBe(false)
  })

  it('keeps existing query parameters and a tag already in the address', () => {
    const url = withUtm('https://example.com/?ref=1&utm_source=newsletter', {
      source: 'instagram',
      campaign: 'spring',
    })
    const params = new URL(url).searchParams
    expect(params.get('ref')).toBe('1')
    expect(params.get('utm_source')).toBe('newsletter')
    expect(params.get('utm_campaign')).toBe('spring')
  })

  it('encodes values', () => {
    const url = withUtm('https://example.com', { campaign: 'spring sale & more' })
    expect(new URL(url).searchParams.get('utm_campaign')).toBe('spring sale & more')
    expect(url).not.toContain(' ')
  })

  it('leaves mail, phone, paths and junk alone', () => {
    const utm = { source: 'instagram' }
    expect(withUtm('mailto:hi@example.com', utm)).toBe('mailto:hi@example.com')
    expect(withUtm('tel:+61400000000', utm)).toBe('tel:+61400000000')
    expect(withUtm('/about', utm)).toBe('/about')
    expect(withUtm('not a url', utm)).toBe('not a url')
  })

  it('returns the address untouched when there is nothing to add', () => {
    expect(withUtm('https://example.com', {})).toBe('https://example.com')
    expect(withUtm('https://example.com', { source: '  ' })).toBe('https://example.com')
  })
})

describe('headingLevels', () => {
  it('never uses h1 (the page supplies it) and never skips a level', () => {
    expect(headingLevels({ hasProfileName: true, hasTitle: true })).toEqual({
      top: 'h2',
      title: 'h3',
      group: 'h3',
    })
    expect(headingLevels({ hasProfileName: false, hasTitle: true })).toEqual({
      top: 'h2',
      title: 'h2',
      group: 'h3',
    })
    expect(headingLevels({ hasProfileName: false, hasTitle: false }).group).toBe('h2')
  })
})
