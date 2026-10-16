import { describe, expect, it } from 'vitest'

import { resolveLink } from './resolve-link'

describe('resolveLink', () => {
  it('resolves links stored before typed actions exactly as before', () => {
    expect(resolveLink({ linkType: 'internal', slug: 'about', openInNewTab: true })).toEqual({
      kind: 'page',
      href: '/about',
      newTab: true,
    })
    expect(resolveLink({ linkType: 'external', url: 'https://example.org' })).toEqual({
      kind: 'external',
      href: 'https://example.org',
      newTab: false,
    })
  })

  it('treats a missing or unknown type as an external URL, as before', () => {
    expect(resolveLink({ url: 'mailto:hi@example.org' })).toMatchObject({ kind: 'external' })
  })

  it('returns null for incomplete links', () => {
    expect(resolveLink(null)).toBeNull()
    expect(resolveLink({ linkType: 'internal' })).toBeNull()
    expect(resolveLink({ linkType: 'external' })).toBeNull()
    expect(resolveLink({ linkType: 'anchor', anchor: ' ' })).toBeNull()
    expect(resolveLink({ linkType: 'panel' })).toBeNull()
  })

  it('resolves an anchor to #id, tolerating a typed #', () => {
    expect(resolveLink({ linkType: 'anchor', anchor: 'pricing' })).toEqual({
      kind: 'anchor',
      href: '#pricing',
    })
    expect(resolveLink({ linkType: 'anchor', anchor: '#faq' })).toEqual({
      kind: 'anchor',
      href: '#faq',
    })
  })

  it('resolves a panel with its title and a safe fallback', () => {
    expect(
      resolveLink({
        linkType: 'panel',
        panel: { id: 'p1', title: 'Enquire' },
        fallbackUrl: '/contact',
      }),
    ).toEqual({ kind: 'panel', panelId: 'p1', title: 'Enquire', fallbackHref: '/contact' })
    expect(
      resolveLink({ linkType: 'panel', panel: { id: 'p1' }, fallbackUrl: 'javascript:alert(1)' }),
    ).toMatchObject({ fallbackHref: undefined })
    expect(
      resolveLink({ linkType: 'panel', panel: { id: 'p1' }, fallbackUrl: '//evil.example' }),
    ).toMatchObject({ fallbackHref: undefined })
  })

  it('resolves booking with or without an override', () => {
    expect(resolveLink({ linkType: 'booking' })).toEqual({
      kind: 'booking',
      fallbackHref: undefined,
    })
    expect(resolveLink({ linkType: 'booking', bookingUrl: '/book' })).toEqual({
      kind: 'booking',
      fallbackHref: '/book',
    })
  })
})
