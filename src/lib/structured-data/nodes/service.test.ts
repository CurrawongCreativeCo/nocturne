import { describe, expect, it } from 'vitest'

import { buildService } from './service'

const ORIGIN = 'https://example.com.au'
const URL = `${ORIGIN}/services/emergency-plumbing`
const base = { origin: ORIGIN, id: 'service-4c1e9b7a', url: URL, name: 'Emergency plumbing' }

describe('buildService', () => {
  it('keys the @id by document, names the organisation as provider and points at the WebPage', () => {
    const { node } = buildService(base)
    expect(node).toEqual({
      '@type': 'Service',
      '@id': `${ORIGIN}/#service-service-4c1e9b7a`,
      url: URL,
      name: 'Emergency plumbing',
      provider: { '@id': `${ORIGIN}/#organization` },
      mainEntityOfPage: { '@id': `${URL}#webpage` },
    })
  })

  it('keeps the @id when the slug changes, and never emits a draft or release-version id', () => {
    const before = buildService(base).node['@id']
    for (const id of ['drafts.service-4c1e9b7a', 'versions.rSummer.service-4c1e9b7a']) {
      const moved = buildService({ ...base, id, url: `${ORIGIN}/services/plumbing` })
      expect(moved.node['@id']).toBe(before)
      expect(JSON.stringify(moved.node)).not.toMatch(/drafts\.|versions\./)
    }
  })

  it('includes summary, image and audience only when given', () => {
    const { node, provenance } = buildService({
      ...base,
      summary: 'Fast help.',
      image: `${ORIGIN}/a.jpg`,
      audience: 'Homeowners',
    })
    expect(node).toMatchObject({
      description: 'Fast help.',
      image: `${ORIGIN}/a.jpg`,
      audience: { '@type': 'Audience', audienceType: 'Homeowners' },
    })
    expect(provenance['audience.audienceType']).toEqual({
      doc: 'service-4c1e9b7a',
      field: 'audience',
    })
    const bare = buildService({ ...base, summary: '', image: null, audience: null }).node
    for (const key of ['description', 'image', 'audience']) expect(bare).not.toHaveProperty(key)
  })

  it('emits an Offer in AUD only when a price and its unit are given', () => {
    expect(buildService(base).node).not.toHaveProperty('offers')
    const { node, provenance } = buildService({ ...base, price: { amount: 150, unit: 'per hour' } })
    expect(node.offers).toEqual({
      '@type': 'Offer',
      price: 150,
      priceCurrency: 'AUD',
      priceSpecification: {
        '@type': 'PriceSpecification',
        minPrice: 150,
        priceCurrency: 'AUD',
        unitText: 'per hour',
      },
    })
    expect(provenance['offers.price']).toEqual({ doc: 'service-4c1e9b7a', field: 'priceFrom' })
  })

  it('claims nothing the page cannot show', () => {
    const { node } = buildService({ ...base, price: { amount: 1, unit: 'each' } })
    for (const key of ['areaServed', 'aggregateRating', 'review'])
      expect(node).not.toHaveProperty(key)
  })
})
