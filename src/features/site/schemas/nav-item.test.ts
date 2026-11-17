import { describe, expect, it } from 'vitest'

import {
  checkFooterNav,
  checkNavLink,
  checkSubLinks,
  isHeaderItem,
  navItem,
  navSubItem,
} from './nav-item'
import { MAX_SUB_LINKS } from '../utils/header-nav'

const link = { _type: 'link', linkType: 'internal', internal: { _ref: 'about' } }
const sub = (n: number) => ({ _key: `s${n}`, _type: 'navSubItem', label: `Sub ${n}`, link })
const subs = (count: number) => Array.from({ length: count }, (_, i) => sub(i))

const field = (type: { fields: { name: string }[] }, name: string) =>
  type.fields.find((f) => f.name === name) as unknown as Record<string, unknown>

describe('navItem schema', () => {
  it('has a label, a link and one level of sub-links of a type that has none', () => {
    expect(navItem.fields.map(({ name }) => name)).toEqual(['label', 'link', 'children'])
    expect(navSubItem.fields.map(({ name }) => name)).toEqual(['label', 'link'])
    expect(field(navItem, 'children').of).toEqual([{ type: 'navSubItem' }])
  })

  it('allows up to eight sub-links', () => {
    expect(MAX_SUB_LINKS).toBe(8)
  })
})

describe('checkNavLink', () => {
  it('needs a link on a flat menu link, as before', () => {
    expect(checkNavLink(link, { label: 'About' })).toBe(true)
    expect(checkNavLink(undefined, { label: 'About' })).toMatch(/Add a link/)
    expect(checkNavLink(undefined, { label: 'About', children: [] })).toMatch(/Add a link/)
  })

  it('lets a link with sub-links leave its own link empty, or keep one', () => {
    expect(checkNavLink(undefined, { label: 'Services', children: subs(1) })).toBe(true)
    expect(checkNavLink(link, { label: 'Services', children: subs(8) })).toBe(true)
  })

  it('copes with malformed sub-links', () => {
    expect(checkNavLink(undefined, { children: 'nope' })).toMatch(/Add a link/)
    expect(checkNavLink(undefined, undefined)).toMatch(/Add a link/)
  })
})

describe('checkSubLinks', () => {
  it('accepts none, one or eight sub-links', () => {
    expect(checkSubLinks(undefined)).toBe(true)
    expect(checkSubLinks(subs(1))).toBe(true)
    expect(checkSubLinks(subs(8))).toBe(true)
  })

  it('rejects grandchildren', () => {
    expect(checkSubLinks([sub(0), { ...sub(1), children: [sub(2)] }])).toMatch(
      /can’t have their own sub-links/,
    )
  })
})

describe('the sub-links rule', () => {
  it('sets a maximum of eight through the array rule', () => {
    const calls: unknown[] = []
    const rule = {
      max: (n: number) => (calls.push(['max', n]), rule),
      custom: (fn: unknown) => (calls.push(['custom', fn]), rule),
    }
    ;(field(navItem, 'children').validation as (r: typeof rule) => unknown)(rule)
    expect(calls).toEqual([
      ['max', 8],
      ['custom', checkSubLinks],
    ])
  })

  it('needs a label and link on every sub-link', () => {
    for (const name of ['label', 'link']) {
      let required = false
      const rule = { required: () => ((required = true), rule) }
      ;(field(navSubItem, name).validation as (r: typeof rule) => unknown)(rule)
      expect(required).toBe(true)
    }
  })
})

describe('checkFooterNav', () => {
  it('keeps footer links flat', () => {
    expect(checkFooterNav([{ label: 'About', link }])).toBe(true)
    expect(checkFooterNav(undefined)).toBe(true)
    expect(checkFooterNav([{ label: 'About', link, children: subs(1) }])).toMatch(/Footer links/)
  })
})

describe('isHeaderItem', () => {
  const document = { headerNav: [{ _key: 'h1' }], footerNav: [{ _key: 'f1' }] }

  it('offers sub-links on header menu links only', () => {
    expect(isHeaderItem(document, { _key: 'h1' })).toBe(true)
    expect(isHeaderItem(document, { _key: 'f1' })).toBe(false)
    expect(isHeaderItem({}, { _key: 'h1' })).toBe(false)
  })
})
