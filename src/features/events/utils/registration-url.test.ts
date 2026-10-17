import { describe, expect, it } from 'vitest'

import { registrationUrl } from './registration-url'

const SITE = 'https://example.com.au'

describe('registrationUrl', () => {
  it('makes a page on this site absolute', () => {
    expect(registrationUrl({ kind: 'page', href: '/book/pottery', newTab: false }, SITE)).toBe(
      'https://example.com.au/book/pottery',
    )
  })

  it('keeps another website as it is', () => {
    expect(
      registrationUrl(
        { kind: 'external', href: 'https://tickets.example.org/e/1', newTab: true },
        SITE,
      ),
    ).toBe('https://tickets.example.org/e/1')
  })

  it('leaves out web-less links and sections of the page', () => {
    expect(
      registrationUrl({ kind: 'external', href: 'mailto:hi@example.com.au', newTab: false }, SITE),
    ).toBeNull()
    expect(registrationUrl({ kind: 'anchor', href: '#book' }, SITE)).toBeNull()
    expect(registrationUrl(null, SITE)).toBeNull()
  })

  it('uses the fallback link of a panel or booking button', () => {
    expect(registrationUrl({ kind: 'booking', fallbackHref: '/book' }, SITE)).toBe(
      'https://example.com.au/book',
    )
    expect(registrationUrl({ kind: 'panel', panelId: 'p1' }, SITE)).toBeNull()
  })
})
