import { describe, expect, it } from 'vitest'

import { buildWebSite } from './website'

describe('buildWebSite', () => {
  it('has the required and recommended properties, published by the organisation', () => {
    const { node, provenance } = buildWebSite({
      origin: 'https://example.com.au',
      name: 'Acme',
      description: 'Plumbers in Newtown.',
      language: 'en-AU',
    })
    expect(node).toEqual({
      '@type': 'WebSite',
      '@id': 'https://example.com.au/#website',
      name: 'Acme',
      url: 'https://example.com.au/',
      description: 'Plumbers in Newtown.',
      inLanguage: 'en-AU',
      publisher: { '@id': 'https://example.com.au/#organization' },
    })
    expect(provenance).toEqual({
      name: { doc: 'siteIdentity', field: 'title' },
      description: { doc: 'siteIdentity', field: 'description' },
    })
  })

  it('leaves out an empty description', () => {
    const { node, provenance } = buildWebSite({
      origin: 'https://example.com.au',
      name: 'Acme',
      description: '',
      language: 'en-AU',
    })
    expect(node).not.toHaveProperty('description')
    expect(provenance).not.toHaveProperty('description')
  })
})
