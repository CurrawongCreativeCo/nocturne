import { describe, expect, it } from 'vitest'

import { buildWebPage } from './web-page'

const base = {
  origin: 'https://example.com.au',
  url: 'https://example.com.au/about/team',
  name: 'Our team',
  nameSource: { doc: 'page-team', field: 'title' },
  language: 'en-AU',
}

describe('buildWebPage', () => {
  it('is part of the website, in the site language, keyed by its URL', () => {
    const { node, provenance } = buildWebPage(base)
    expect(node).toEqual({
      '@type': 'WebPage',
      '@id': 'https://example.com.au/about/team#webpage',
      url: 'https://example.com.au/about/team',
      name: 'Our team',
      isPartOf: { '@id': 'https://example.com.au/#website' },
      inLanguage: 'en-AU',
      publisher: { '@id': 'https://example.com.au/#organization' },
    })
    expect(provenance).toEqual({ name: { doc: 'page-team', field: 'title' } })
  })

  it('points at its main entity and its breadcrumb by @id', () => {
    const { node } = buildWebPage({
      ...base,
      about: 'https://example.com.au/#person-abc',
      breadcrumb: true,
    })
    expect(node.about).toEqual({ '@id': 'https://example.com.au/#person-abc' })
    expect(node.breadcrumb).toEqual({ '@id': 'https://example.com.au/about/team#breadcrumb' })
  })

  it('has no about or breadcrumb when the page has neither', () => {
    const { node } = buildWebPage(base)
    expect(node).not.toHaveProperty('about')
    expect(node).not.toHaveProperty('breadcrumb')
  })
})
