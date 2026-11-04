import { describe, expect, it } from 'vitest'

import { MAX_SUB_LINKS, toHeaderNav } from './header-nav'

const page = (slug: string) => ({ linkType: 'internal', slug })
const item = (label: string, extra: Record<string, unknown> = {}) => ({
  _key: label.toLowerCase(),
  label,
  link: page(label.toLowerCase()),
  ...extra,
})
const subs = (count: number) => Array.from({ length: count }, (_, i) => item(`Sub ${i}`))

describe('toHeaderNav', () => {
  it('passes a flat menu through unchanged, with no sub-links', () => {
    expect(toHeaderNav([item('Home'), item('About')])).toEqual([
      { key: 'home', label: 'Home', link: page('home'), children: [] },
      { key: 'about', label: 'About', link: page('about'), children: [] },
    ])
  })

  it('keeps zero, one and eight sub-links', () => {
    const [none, one, eight] = toHeaderNav([
      item('A', { children: [] }),
      item('B', { children: subs(1) }),
      item('C', { children: subs(8) }),
    ])
    expect(none?.children).toEqual([])
    expect(one?.children.map(({ label }) => label)).toEqual(['Sub 0'])
    expect(eight?.children).toHaveLength(8)
  })

  it('shows at most eight sub-links even if more were stored', () => {
    expect(toHeaderNav([item('A', { children: subs(9) })])[0]?.children).toHaveLength(MAX_SUB_LINKS)
  })

  it('keeps a parent without its own link when it has sub-links', () => {
    expect(toHeaderNav([{ _key: 'p', label: 'Services', children: subs(2) }])).toEqual([
      expect.objectContaining({ label: 'Services', link: null }),
    ])
  })

  it('drops sub-links without a label or a working link, and ignores grandchildren', () => {
    const [entry] = toHeaderNav([
      item('A', {
        children: [
          { _key: 'x', label: '  ', link: page('x') },
          { _key: 'y', label: 'No link' },
          { _key: 'z', label: 'Broken', link: { linkType: 'internal', slug: null } },
          item('Kept', { children: subs(3) }),
          'junk',
        ],
      }),
    ])
    expect(entry?.children).toEqual([{ key: 'kept', label: 'Kept', link: page('kept') }])
  })

  it('drops entries with nothing to show', () => {
    expect(
      toHeaderNav([
        { _key: 'a', label: 'No link, no sub-links' },
        { _key: 'b', label: 'Only broken sub-links', children: [{ label: 'x' }] },
        { _key: 'c', link: page('c') },
        null,
        42,
      ]),
    ).toEqual([])
  })

  it('copes with missing or malformed data', () => {
    expect(toHeaderNav(null)).toEqual([])
    expect(toHeaderNav(undefined)).toEqual([])
    expect(toHeaderNav({ headerNav: [] })).toEqual([])
    expect(toHeaderNav([item('A', { children: 'nope' })])[0]?.children).toEqual([])
  })
})
