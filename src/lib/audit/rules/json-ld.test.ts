import { describe, expect, it } from 'vitest'

import { ORIGIN as FIXTURE_ORIGIN, siteGraphNodes, webPageNode } from '../fixtures'
import { context, snapshot } from '../page.fixtures'
import type { PageSnapshot } from '../types'
import { graphIntegrityFindings, jsonLdParseFindings, visibleParityFindings } from './json-ld'

const script = (nodes: unknown[]) =>
  JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes })
const url = `${FIXTURE_ORIGIN}/about`
const ctx = (overrides = {}) => context({ origin: FIXTURE_ORIGIN, ...overrides })
const page = (overrides: Partial<PageSnapshot> = {}) =>
  snapshot({
    url,
    jsonLd: [script(siteGraphNodes()), script([webPageNode('/about', 'About us')])],
    visibleText:
      'Bondi Plumbing 12 Campbell Parade, Bondi Beach NSW 2026 Phone (02) 9123 4567 hello@bondi-plumbing.example About us Licensed Sydney plumbers, on call day and night.',
    ...overrides,
  })

describe('sd.json-ld-invalid', () => {
  it('passes JSON that parses', () => {
    expect(jsonLdParseFindings(page(), ctx())).toEqual([])
  })

  it('reports a script that is not JSON', () => {
    const [finding] = jsonLdParseFindings(page({ jsonLd: ['{"@type": "WebPage",'] }), ctx())
    expect(finding).toMatchObject({
      ruleId: 'sd.json-ld-invalid',
      severity: 'error',
      evidence: { source: 'json-ld', observed: { scripts: 1 } },
    })
  })
})

describe('sd.visible-parity', () => {
  it('passes structured data the page shows', () => {
    expect(visibleParityFindings(page(), ctx())).toEqual([])
  })

  it('reports a phone number the page does not show, naming the property', () => {
    const [finding] = visibleParityFindings(
      page({ visibleText: page().visibleText.replace('(02) 9123 4567', '(02) 9000 0000') }),
      ctx(),
    )
    expect(finding?.ruleId).toBe('sd.visible-parity')
    expect(JSON.stringify(finding?.evidence.observed)).toContain('telephone')
  })

  it('accepts a fact the site shows on the compared pages when the rule only needs the site', () => {
    const withoutAddress = page({ visibleText: 'Bondi Plumbing About us' })
    expect(visibleParityFindings(withoutAddress, ctx())).not.toEqual([])
  })

  it('does not expect a Minimal page to show the business details', () => {
    const minimal = page({
      visibleText: 'Links Licensed Sydney plumbers, on call day and night.',
      minimal: true,
    })
    const found = visibleParityFindings(minimal, ctx())
    expect(JSON.stringify(found)).not.toContain('telephone')
  })

  it('does not judge a site-wide description when no other page was read', () => {
    const odd = page({
      visibleText:
        'Bondi Plumbing 12 Campbell Parade, Bondi Beach NSW 2026 Phone (02) 9123 4567 hello@bondi-plumbing.example About us',
    })
    expect(visibleParityFindings(odd, ctx())).toEqual([])
    const peer = { ...page({ url: `${FIXTURE_ORIGIN}/`, visibleText: 'Home' }), jsonLd: [] }
    expect(JSON.stringify(visibleParityFindings(odd, ctx({ peers: [peer] })))).toContain(
      'WebSite.description',
    )
  })

  it('says nothing about a page with no structured data', () => {
    expect(visibleParityFindings(page({ jsonLd: [] }), ctx())).toEqual([])
  })
})

describe('sd.graph-integrity', () => {
  it('passes a graph that is whole', () => {
    expect(graphIntegrityFindings(page(), ctx())).toEqual([])
  })

  it('reports a WebPage that is not part of the website', () => {
    const { isPartOf: _isPartOf, ...orphan } = webPageNode('/about', 'About us')
    const [finding] = graphIntegrityFindings(
      page({ jsonLd: [script(siteGraphNodes()), script([orphan])] }),
      ctx(),
    )
    expect(finding?.ruleId).toBe('sd.graph-integrity')
    expect(JSON.stringify(finding?.evidence.observed)).toContain('isPartOf')
  })

  it('reports a page with no WebPage of its own, unless the page is hidden from search', () => {
    const bare = page({ jsonLd: [script(siteGraphNodes())] })
    expect(JSON.stringify(graphIntegrityFindings(bare, ctx())[0]?.evidence.observed)).toContain(
      'no WebPage node',
    )
    const hidden = { ...bare, noindex: { meta: true, header: false } }
    expect(graphIntegrityFindings(hidden, ctx())).toEqual([])
  })

  it('reports an @id defined twice and a reference to nothing', () => {
    const duplicate = [
      ...siteGraphNodes(),
      webPageNode('/about', 'About us'),
      webPageNode('/about', 'About us'),
    ]
    const dangling = {
      '@type': 'Service',
      '@id': `${FIXTURE_ORIGIN}/#service-x`,
      provider: { '@id': `${FIXTURE_ORIGIN}/#nobody` },
    }
    const found = graphIntegrityFindings(
      page({ jsonLd: [script([...duplicate, dangling])] }),
      ctx(),
    )
    const text = JSON.stringify(found[0]?.evidence.observed)
    expect(text).toContain('defined twice')
    expect(text).toContain('#nobody')
  })

  it('reports an @id that disagrees with the same @id on another page', () => {
    const otherNodes = siteGraphNodes().map((node) =>
      node['@type'] === 'LocalBusiness' ? { ...node, telephone: '+61299999999' } : node,
    )
    const peer = { ...page({ url: `${FIXTURE_ORIGIN}/` }), jsonLd: [script(otherNodes)] }
    const found = graphIntegrityFindings(page(), ctx({ peers: [peer] }))
    expect(JSON.stringify(found[0]?.evidence.observed)).toContain('different telephone')
  })

  it('reports a draft id', () => {
    const draft = { '@type': 'Service', '@id': `${FIXTURE_ORIGIN}/#service-drafts.abc` }
    const found = graphIntegrityFindings(
      page({ jsonLd: [script([...siteGraphNodes(), webPageNode('/about', 'About us'), draft])] }),
      ctx(),
    )
    expect(JSON.stringify(found[0]?.evidence.observed)).toContain('draft')
  })
})
