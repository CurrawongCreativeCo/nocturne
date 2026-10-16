import { describe, expect, it } from 'vitest'

import {
  drawableLinks,
  groupDrawn,
  linkTrackProps,
  prepareLinks,
  resolveSocials,
} from './link-list-items'

const external = (url: string) => ({ linkType: 'external', url })

describe('prepareLinks', () => {
  it('keeps the editor’s order', () => {
    const prepared = prepareLinks([
      { _key: 'a', label: 'First', link: external('https://a.example') },
      { _key: 'b', label: 'Second', link: external('https://b.example') },
    ])
    expect(prepared.map(({ label }) => label)).toEqual(['First', 'Second'])
  })

  it('leaves out a link with no label or an unfinished destination', () => {
    const prepared = prepareLinks([
      { _key: 'a', label: '  ', link: external('https://a.example') },
      { _key: 'b', label: 'No address', link: { linkType: 'external' } },
      { _key: 'c', label: 'No page', link: { linkType: 'internal' } },
      { _key: 'd', label: 'Fine', link: external('https://d.example') },
    ])
    expect(prepared.map(({ label }) => label)).toEqual(['Fine'])
  })

  it('adds tracking tags to a website’s address, and only there', () => {
    const [site, page, mail] = prepareLinks([
      {
        _key: 'a',
        label: 'Site',
        utmSource: 'instagram',
        utmMedium: 'bio',
        link: external('https://a.example/shop'),
      },
      {
        _key: 'b',
        label: 'Page',
        utmSource: 'instagram',
        link: { linkType: 'internal', slug: 'about' },
      },
      { _key: 'c', label: 'Mail', utmSource: 'instagram', link: external('mailto:hi@example.com') },
    ])
    const params = new URL(site?.link.url ?? '').searchParams
    expect(params.get('utm_source')).toBe('instagram')
    expect(params.get('utm_medium')).toBe('bio')
    expect(page?.link).toEqual({ linkType: 'internal', slug: 'about' })
    expect(mail?.link.url).toBe('mailto:hi@example.com')
  })

  it('reports the kind of destination and whether the link is scheduled', () => {
    const [site, page, panel, dated] = prepareLinks([
      { _key: 'a', label: 'Site', link: external('https://a.example') },
      { _key: 'b', label: 'Page', link: { linkType: 'internal', slug: 'about' } },
      { _key: 'c', label: 'Panel', link: { linkType: 'panel', panel: { id: 'p1' } } },
      {
        _key: 'd',
        label: 'Dated',
        showFrom: '2026-10-20T00:00:00Z',
        link: external('https://d.example'),
      },
    ])
    expect([site?.kind, page?.kind, panel?.kind]).toEqual(['external', 'page', 'panel'])
    expect([site?.scheduled, dated?.scheduled]).toEqual([false, true])
  })

  it('handles no links', () => {
    expect(prepareLinks(null)).toEqual([])
    expect(prepareLinks(undefined)).toEqual([])
  })
})

const NOW = Date.parse('2026-10-16T00:00:00Z')

describe('drawableLinks', () => {
  const links = prepareLinks([
    { _key: 'a', label: 'A', link: external('https://a.example') },
    { _key: 'b', label: 'B', featured: true, link: external('https://b.example') },
    {
      _key: 'later',
      label: 'Later',
      featured: true,
      showFrom: '2099-01-01T00:00:00Z',
      link: external('https://later.example'),
    },
    {
      _key: 'over',
      label: 'Over',
      showUntil: '2020-01-01T00:00:00Z',
      link: external('https://over.example'),
    },
    {
      _key: 'window',
      label: 'Window',
      showFrom: '2020-01-01T00:00:00Z',
      showUntil: '2099-01-01T00:00:00Z',
      link: external('https://window.example'),
    },
  ])

  it('draws the links that are due, in order, and numbers them from 1', () => {
    const drawn = drawableLinks(links, NOW)
    expect(drawn.map(({ label, position }) => [label, position])).toEqual([
      ['A', 1],
      ['B', 2],
      ['Window', 3],
    ])
  })

  it('draws a scheduled link once its time comes, and drops it when its window closes', () => {
    expect(drawableLinks(links, Date.parse('2099-06-01T00:00:00Z')).map((l) => l.label)).toEqual([
      'A',
      'B',
      'Later',
    ])
  })

  it('without a clock (the prerendered page) leaves out every scheduled link', () => {
    expect(drawableLinks(links).map((l) => l.label)).toEqual(['A', 'B'])
  })

  it('shows one large link: the first featured of those drawn', () => {
    expect(drawableLinks(links, NOW).map((l) => l.large)).toEqual([false, true, false])
    // Once "Later" is due it is still second featured, so B stays the large one.
    expect(drawableLinks(links, Date.parse('2099-06-01T00:00:00Z')).map((l) => l.large)).toEqual([
      false,
      true,
      false,
    ])
  })

  it('lets the next featured link take over when the first is not due', () => {
    const [first] = prepareLinks([
      {
        _key: 'x',
        label: 'X',
        featured: true,
        showFrom: '2099-01-01T00:00:00Z',
        link: external('https://x.example'),
      },
    ])
    const second = prepareLinks([
      { _key: 'y', label: 'Y', featured: true, link: external('https://y.example') },
    ])
    const drawn = drawableLinks([...(first ? [first] : []), ...second], NOW)
    expect(drawn.map((l) => [l.label, l.large])).toEqual([['Y', true]])
  })

  it('groups in order', () => {
    const groups = groupDrawn(
      drawableLinks(
        prepareLinks([
          { _key: 'a', label: 'A', link: external('https://a.example') },
          { _key: 'b', label: 'B', group: 'Shop', link: external('https://b.example') },
          { _key: 'c', label: 'C', group: 'Follow', link: external('https://c.example') },
          { _key: 'd', label: 'D', group: 'Shop', link: external('https://d.example') },
        ]),
        NOW,
      ),
    )
    expect(groups.map((group) => group.heading)).toEqual([undefined, 'Shop', 'Follow'])
    expect(groups.map((group) => group.links.map((link) => link.position))).toEqual([
      [1],
      [2, 4],
      [3],
    ])
  })

  it('leaves out a group whose links are all not due', () => {
    const groups = groupDrawn(
      drawableLinks(
        prepareLinks([
          { _key: 'a', label: 'A', link: external('https://a.example') },
          {
            _key: 'b',
            label: 'B',
            group: 'Coming up',
            showFrom: '2099-01-01T00:00:00Z',
            link: external('https://b.example'),
          },
        ]),
        NOW,
      ),
    )
    expect(groups.map((group) => group.heading)).toEqual([undefined])
  })
})

describe('linkTrackProps', () => {
  const [site, page, mail] = drawableLinks(
    prepareLinks([
      {
        _key: 'a',
        label: 'Book',
        group: 'Shop',
        utmSource: 'instagram',
        link: external('https://example.com/book?token=1#top'),
      },
      { _key: 'b', label: 'Journal', link: { linkType: 'internal', slug: 'about' } },
      { _key: 'c', label: 'Email', link: external('mailto:hi@example.com') },
    ]),
    NOW,
  )

  it('reports a website link with its address but no query string or tags', () => {
    expect(site && linkTrackProps(site)).toEqual({
      label: 'Book',
      kind: 'external',
      outbound: true,
      position: 1,
      group: 'Shop',
      url: 'https://example.com/book',
    })
  })

  it('reports a page on this site as not outbound, with no address', () => {
    expect(page && linkTrackProps(page)).toEqual({
      label: 'Journal',
      kind: 'page',
      outbound: false,
      position: 2,
    })
  })

  it('reports no address for mail or phone links', () => {
    expect(mail && linkTrackProps(mail)).not.toHaveProperty('url')
  })
})

describe('resolveSocials', () => {
  const business = [
    { _key: 'b1', platform: 'instagram', url: 'https://instagram.com/currawong' },
    { _key: 'b2', platform: 'facebook', url: 'https://facebook.com/currawong' },
  ]
  const custom = [{ _key: 'c1', platform: 'tiktok', url: 'https://tiktok.com/@currawong' }]

  it('uses Business info by default, and when unset', () => {
    expect(resolveSocials('business', custom, business).map((p) => p._key)).toEqual(['b1', 'b2'])
    expect(resolveSocials(undefined, custom, business).map((p) => p._key)).toEqual(['b1', 'b2'])
  })

  it('uses the section’s own set when chosen', () => {
    expect(resolveSocials('custom', custom, business).map((p) => p._key)).toEqual(['c1'])
  })

  it('shows nothing for none, or when there is nothing to show', () => {
    expect(resolveSocials('none', custom, business)).toEqual([])
    expect(resolveSocials('business', custom, null)).toEqual([])
    expect(resolveSocials('custom', null, business)).toEqual([])
  })

  it('draws only https addresses', () => {
    const list = [
      { _key: 'x', platform: 'other', url: 'javascript:alert(1)' },
      { _key: 'y', platform: 'other', url: 'http://insecure.example' },
      { _key: 'z', platform: 'other', url: null },
      { _key: 'ok', platform: 'other', url: ' https://ok.example ' },
    ]
    expect(resolveSocials('custom', list, null).map((p) => p._key)).toEqual(['ok'])
  })
})
