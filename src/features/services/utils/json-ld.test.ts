import { describe, expect, it } from 'vitest'

import { buildServiceFaqJsonLd, buildServiceJsonLd, publishedKey } from './json-ld'

const ORIGIN = 'https://example.com.au'
const URL = `${ORIGIN}/services/emergency-plumbing`
const base = {
  documentId: 'service-4c1e9b7a',
  origin: ORIGIN,
  url: URL,
  name: 'Emergency plumbing',
}

describe('publishedKey', () => {
  it('leaves a published id alone and strips draft and release prefixes', () => {
    expect(publishedKey('4c1e9b7a')).toBe('4c1e9b7a')
    expect(publishedKey('drafts.4c1e9b7a')).toBe('4c1e9b7a')
    expect(publishedKey('versions.rSummer.4c1e9b7a')).toBe('4c1e9b7a')
  })
})

describe('buildServiceJsonLd', () => {
  it('keys the @id by document and names the organisation as provider', () => {
    const node = buildServiceJsonLd(base)
    expect(node['@type']).toBe('Service')
    expect(node['@id']).toBe(`${ORIGIN}/#service-service-4c1e9b7a`)
    expect(node.url).toBe(URL)
    expect(node.provider).toEqual({ '@id': `${ORIGIN}/#organization` })
  })

  it('keeps the @id when the slug (and so the URL) changes, and never emits a draft id', () => {
    const before = buildServiceJsonLd(base)
    const moved = buildServiceJsonLd({
      ...base,
      documentId: `drafts.${base.documentId}`,
      url: `${ORIGIN}/services/plumbing`,
    })
    expect(moved['@id']).toBe(before['@id'])
    expect(JSON.stringify(moved)).not.toContain('drafts.')
  })

  it('points the nested WebPage at the website and organisation', () => {
    expect(buildServiceJsonLd(base).mainEntityOfPage).toEqual({
      '@type': 'WebPage',
      '@id': `${URL}#webpage`,
      isPartOf: { '@id': `${ORIGIN}/#website` },
      publisher: { '@id': `${ORIGIN}/#organization` },
    })
  })

  it('omits everything the page does not show', () => {
    const node = buildServiceJsonLd(base)
    for (const key of [
      'description',
      'image',
      'offers',
      'areaServed',
      'aggregateRating',
      'review',
    ]) {
      expect(node).not.toHaveProperty(key)
    }
  })

  it('adds the summary and image when present', () => {
    const node = buildServiceJsonLd({
      ...base,
      summary: 'Burst pipes fixed the same day.',
      image: 'https://cdn.example/x.jpg',
    })
    expect(node.description).toBe('Burst pipes fixed the same day.')
    expect(node.image).toBe('https://cdn.example/x.jpg')
  })

  it('adds an Offer only when a price is shown, in AUD with its unit', () => {
    expect(
      buildServiceJsonLd({ ...base, price: { amount: 150, unit: 'per hour' } }).offers,
    ).toEqual({
      '@type': 'Offer',
      priceSpecification: {
        '@type': 'PriceSpecification',
        minPrice: 150,
        priceCurrency: 'AUD',
        unitText: 'per hour',
      },
    })
  })
})

describe('buildServiceFaqJsonLd', () => {
  it('is null without questions', () => {
    expect(buildServiceFaqJsonLd({ url: URL })).toBeNull()
    expect(buildServiceFaqJsonLd({ url: URL, faqs: [] })).toBeNull()
  })

  it('is one page-keyed node holding every question', () => {
    const node = buildServiceFaqJsonLd({
      url: URL,
      faqs: [
        { question: 'Do you work weekends?', answer: 'Yes, every day.' },
        { question: 'Is there a call-out fee?', answer: 'No.' },
      ],
    })
    expect(node?.['@type']).toBe('FAQPage')
    expect(node?.['@id']).toBe(`${URL}#faq`)
    expect(node?.mainEntity).toEqual([
      {
        '@type': 'Question',
        name: 'Do you work weekends?',
        acceptedAnswer: { '@type': 'Answer', text: 'Yes, every day.' },
      },
      {
        '@type': 'Question',
        name: 'Is there a call-out fee?',
        acceptedAnswer: { '@type': 'Answer', text: 'No.' },
      },
    ])
  })
})
