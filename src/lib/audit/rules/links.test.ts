import { describe, expect, it } from 'vitest'

import { context, snapshot, URL } from '../page.fixtures'
import { internalBrokenFindings, internalLinks } from './links'

describe('internalLinks', () => {
  it('lists same-site pages once, without fragments, in order', () => {
    expect(
      internalLinks(
        [
          '/contact',
          '/contact#form',
          'https://example.com.au/contact/',
          '/services/web?x=1',
          '#top',
          'mailto:hi@example.com.au',
          'tel:+61291234567',
          'https://other.example/a',
          '/studio/desk',
          '/api/search',
          '/events/feed.ics',
          '/about',
          'javascript:void(0)',
        ],
        URL,
      ),
    ).toEqual(['https://example.com.au/contact', 'https://example.com.au/services/web?x=1'])
  })
})

describe('internalLinks never names another host', () => {
  it('leaves out private addresses, other schemes and look-alike hosts', () => {
    expect(
      internalLinks(
        [
          'http://169.254.169.254/latest/meta-data/',
          'http://localhost:9999/__fixture/mutations',
          'http://127.0.0.1/',
          'http://[::1]/',
          'http://10.0.0.1/',
          'https://example.com.au.evil.example/x',
          'https://user:pw@evil.example/',
          '//evil.example/x',
          'file:///etc/passwd',
          'ftp://example.com.au/x',
          'javascript:alert(1)',
          '/ok',
        ],
        URL,
      ),
    ).toEqual(['https://example.com.au/ok'])
  })

  it('does not treat the expected production origin as a reason to name any other host', () => {
    expect(
      internalLinks(
        ['https://example.com.au/a', 'http://169.254.169.254/', 'https://other.example/b'],
        'http://localhost:3100/about',
        'https://example.com.au/about',
      ),
    ).toEqual(['http://localhost:3100/a'])
  })
})

describe('internalLinks on a preview', () => {
  it('treats links that name the production origin as internal, and asks the preview host', () => {
    expect(
      internalLinks(
        ['https://example.com.au/contact', '/pricing', 'https://other.example/x'],
        'http://localhost:3100/about',
        'https://example.com.au/about',
      ),
    ).toEqual(['http://localhost:3100/contact', 'http://localhost:3100/pricing'])
  })
})

describe('links.internal-broken', () => {
  const links = (answers: Record<string, { status: number; error?: string }>) =>
    context({ links: answers })

  it('passes links that answer, redirect or are gated', () => {
    expect(
      internalBrokenFindings(
        snapshot({ links: ['/a', '/b', '/c'] }),
        links({
          'https://example.com.au/a': { status: 200 },
          'https://example.com.au/b': { status: 301 },
          'https://example.com.au/c': { status: 403 },
        }),
      ),
    ).toEqual([])
  })

  it('reports 404, 410, server errors and failed requests', () => {
    const [finding] = internalBrokenFindings(
      snapshot({ links: ['/a', '/b', '/c', '/d'] }),
      links({
        'https://example.com.au/a': { status: 404 },
        'https://example.com.au/b': { status: 410 },
        'https://example.com.au/c': { status: 502 },
        'https://example.com.au/d': { status: 0, error: 'timeout' },
      }),
    )
    expect(finding).toMatchObject({ ruleId: 'links.internal-broken', severity: 'error' })
    expect(finding?.evidence.observed).toHaveLength(4)
  })

  it('judges only the links it requested', () => {
    expect(internalBrokenFindings(snapshot({ links: ['/never-asked'] }), links({}))).toEqual([])
  })
})
