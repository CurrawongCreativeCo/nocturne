import { describe, expect, it } from 'vitest'

import { context, pageContent, snapshot, URL } from '../page.fixtures'
import { indexabilityFindings } from './indexability'

const ids = (found: ReturnType<typeof indexabilityFindings>) => found.map((f) => f.ruleId)

describe('indexability', () => {
  it('finds nothing wrong with an indexable page that names itself', () => {
    expect(indexabilityFindings(snapshot(), context())).toEqual([])
    // Trailing slash, fragment and host case do not make a canonical "elsewhere".
    expect(
      indexabilityFindings(
        snapshot({ canonical: 'https://EXAMPLE.com.au/about/#team' }),
        context(),
      ),
    ).toEqual([])
  })

  it('reports a page that does not answer 200 as a blocker, and says nothing else', () => {
    const found = indexabilityFindings(
      snapshot({ status: 404, noindex: { meta: true, header: false }, canonical: '' }),
      context(),
    )
    expect(ids(found)).toEqual(['seo.status'])
    expect(found[0]).toMatchObject({ severity: 'blocker', evidence: { observed: { status: 404 } } })
  })

  it('reports a failed request with its error', () => {
    const [finding] = indexabilityFindings(
      snapshot({ status: 0, error: 'getaddrinfo ENOTFOUND' }),
      context(),
    )
    expect(finding?.evidence.observed).toMatchObject({ error: 'getaddrinfo ENOTFOUND' })
  })

  describe('noindex', () => {
    it('is a blocker from the meta tag or the header', () => {
      const meta = indexabilityFindings(
        snapshot({ robotsMeta: 'noindex', noindex: { meta: true, header: false } }),
        context(),
      )
      expect(meta[0]).toMatchObject({ ruleId: 'seo.noindex', severity: 'blocker' })
      expect(meta[0]?.evidence.source).toBe('html')
      const header = indexabilityFindings(
        snapshot({ xRobotsTag: 'noindex', noindex: { meta: false, header: true } }),
        context(),
      )
      expect(header[0]?.evidence.source).toBe('headers')
    })

    it('is only a suggestion when the editor hid the page on purpose, and points at the switch', () => {
      const [finding] = indexabilityFindings(
        snapshot({ noindex: { meta: true, header: false } }),
        context({ content: pageContent({ seo: { noIndex: true } }) }),
      )
      expect(finding).toMatchObject({
        severity: 'suggestion',
        scope: { documentId: 'page-about', path: 'seo.noIndex' },
        fix: { studioIntent: 'edit;id=page-about;type=page;path=seo.noIndex' },
      })
    })

    it('is a blocker, with a caveat, when the switch is off or the document is unknown', () => {
      const off = indexabilityFindings(
        snapshot({ noindex: { meta: true, header: false } }),
        context({ content: pageContent({ seo: { noIndex: false } }) }),
      )
      expect(off[0]?.severity).toBe('blocker')
      expect(off[0]?.evidence.caveats?.[0]).toContain('switch is off')
      const unknown = indexabilityFindings(
        snapshot({ noindex: { meta: true, header: false } }),
        context(),
      )
      expect(unknown[0]?.evidence.caveats?.[0]).toContain('could not read')
    })
  })

  it('reports a path robots.txt disallows for Googlebot', () => {
    const found = indexabilityFindings(
      snapshot({ url: `${URL}/x`, canonical: `${URL}/x` }),
      context({ robots: { groups: [{ agents: ['*'], allow: [], disallow: ['/about'] }] } }),
    )
    expect(found.map((f) => [f.ruleId, f.severity])).toEqual([['seo.robots-blocked', 'blocker']])
  })

  it('says nothing about robots.txt it could not read', () => {
    expect(indexabilityFindings(snapshot(), context({ robots: null }))).toEqual([])
  })

  describe('canonical', () => {
    it('warns about a missing canonical', () => {
      const found = indexabilityFindings(snapshot({ canonical: '' }), context())
      expect(found.map((f) => [f.ruleId, f.severity])).toEqual([
        ['seo.canonical-missing', 'warning'],
      ])
    })

    it('reads a relative canonical against the page', () => {
      expect(indexabilityFindings(snapshot({ canonical: '/about' }), context())).toEqual([])
    })

    it('is a blocker when the canonical redirects, naming where it goes', () => {
      const [finding] = indexabilityFindings(
        snapshot({ canonical: ORIGIN_OLD }),
        context({
          canonical: { status: 301, redirectedTo: 'https://example.com.au/about' },
        }),
      )
      expect(finding).toMatchObject({ ruleId: 'seo.canonical-status', severity: 'blocker' })
      expect(finding?.fix.summary).toContain('https://example.com.au/about')
    })

    it('is a blocker when the canonical is a 404 or the request failed', () => {
      for (const canonical of [{ status: 404 }, { status: 0, error: 'timeout' }]) {
        const [finding] = indexabilityFindings(
          snapshot({ canonical: ORIGIN_OLD }),
          context({ canonical }),
        )
        expect(finding?.ruleId).toBe('seo.canonical-status')
      }
    })

    it('warns, with a caveat, about a canonical on another page that answers 200', () => {
      const [finding] = indexabilityFindings(
        snapshot({ canonical: 'https://example.com.au/other' }),
        context({ canonical: { status: 200 } }),
      )
      expect(finding).toMatchObject({ ruleId: 'seo.canonical-elsewhere', severity: 'warning' })
      expect(finding?.evidence.caveats?.[0]).toContain('deliberate')
    })

    it('does not fetch a canonical on another domain, and says so', () => {
      const [finding] = indexabilityFindings(
        snapshot({ canonical: 'https://www.example.com/about' }),
        context(),
      )
      expect(finding?.ruleId).toBe('seo.canonical-elsewhere')
      expect(finding?.evidence.caveats?.join(' ')).toContain('not fetched')
    })
  })
})

const ORIGIN_OLD = 'https://example.com.au/old-about'
