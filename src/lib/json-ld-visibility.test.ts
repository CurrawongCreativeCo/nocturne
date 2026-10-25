import { describe, expect, it } from 'vitest'

import {
  collectCheckableStrings,
  findHiddenStrings,
  findIdProblems,
  findWebPageProblems,
  normaliseText,
  parseJsonLd,
  type JsonLdNode,
} from './json-ld-visibility'

const ORIGIN = 'https://example.com'

const organization: JsonLdNode = {
  '@type': 'ProfessionalService',
  '@id': `${ORIGIN}/#organization`,
  name: 'Test Co',
  legalName: 'Test Co Pty Ltd',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '1 King Street',
    addressLocality: 'Newtown',
    addressRegion: 'NSW',
    postalCode: '2042',
    addressCountry: 'AU',
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday'],
      opens: '08:00',
      closes: '17:30',
    },
    {
      '@type': 'OpeningHoursSpecification',
      opens: '00:00',
      closes: '00:00',
      validFrom: '2099-12-25',
      validThrough: '2099-12-25',
    },
  ],
  areaServed: [{ '@type': 'Place', name: 'Inner West' }],
}
const website: JsonLdNode = {
  '@type': 'WebSite',
  '@id': `${ORIGIN}/#website`,
  name: 'Test Co',
  publisher: { '@id': `${ORIGIN}/#organization` },
}
const faq: JsonLdNode = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What do you do?',
      acceptedAnswer: { '@type': 'Answer', text: 'We build websites.\nAnd we host them.' },
    },
  ],
}

const pageText = `
  Test Co
  1 King Street
  Newtown NSW 2042
  Mon–Fri  8:00 am – 5:30 pm
  What do you do?
  We build websites.

  And we host them.
`

const values = (nodes: JsonLdNode[]) => collectCheckableStrings(nodes).map((s) => s.value)

describe('normaliseText', () => {
  it('collapses whitespace and folds case', () => {
    expect(normaliseText('  Hello \n\t  World  ')).toBe('hello world')
  })

  it('decodes named and numeric entities', () => {
    expect(normaliseText('Fish &amp; chips&nbsp;&#8211; &#x41;ll day')).toBe(
      'fish & chips - all day',
    )
  })

  it('folds typographic quotes and dashes', () => {
    expect(normaliseText('It’s “open” 9–5…')).toBe('it\'s "open" 9-5...')
  })

  it('leaves unknown entities as they are', () => {
    expect(normaliseText('&bogus; &#99999999;')).toBe('&bogus; &#99999999;')
  })
})

describe('parseJsonLd', () => {
  it('flattens @graph and keeps single objects', () => {
    const { nodes, errors } = parseJsonLd([
      JSON.stringify({ '@context': 'https://schema.org', '@graph': [organization, website] }),
      JSON.stringify(faq),
    ])
    expect(errors).toEqual([])
    expect(nodes.map((node) => node['@type'])).toEqual([
      'ProfessionalService',
      'WebSite',
      'FAQPage',
    ])
  })

  it('reports invalid JSON instead of throwing', () => {
    expect(parseJsonLd(['{nope']).errors).toEqual(['JSON-LD script 1 is not valid JSON'])
  })
})

describe('collectCheckableStrings', () => {
  it('picks out names, address parts, weekly times and FAQ lines', () => {
    expect(collectCheckableStrings([organization, website, faq])).toEqual([
      { property: 'ProfessionalService.name', value: 'Test Co' },
      { property: 'ProfessionalService.address.streetAddress', value: '1 King Street' },
      { property: 'ProfessionalService.address.addressLocality', value: 'Newtown' },
      { property: 'ProfessionalService.address.addressRegion', value: 'NSW' },
      { property: 'ProfessionalService.address.postalCode', value: '2042' },
      { property: 'ProfessionalService.openingHoursSpecification[0].opens', value: '8:00 am' },
      { property: 'ProfessionalService.openingHoursSpecification[0].closes', value: '5:30 pm' },
      { property: 'WebSite.name', value: 'Test Co' },
      { property: 'FAQPage.mainEntity[0].name', value: 'What do you do?' },
      { property: 'FAQPage.mainEntity[0].acceptedAnswer.text', value: 'We build websites.' },
      { property: 'FAQPage.mainEntity[0].acceptedAnswer.text', value: 'And we host them.' },
    ])
  })

  it('skips legal names, service areas and dated special days', () => {
    const all = values([organization])
    expect(all).not.toContain('Test Co Pty Ltd')
    expect(all).not.toContain('Inner West')
    expect(all).not.toContain('12:00 am')
  })

  it('splits a plain-text address at commas and line breaks', () => {
    const event: JsonLdNode = {
      '@type': 'Event',
      name: 'Pottery workshop',
      location: { '@type': 'Place', name: 'The Studio', address: '12 Rose St, Newtown NSW 2042' },
    }
    expect(values([event])).toEqual([
      'Pottery workshop',
      'The Studio',
      '12 Rose St',
      'Newtown NSW 2042',
    ])
  })

  it('reaches names nested in breadcrumbs and authors', () => {
    const article: JsonLdNode = {
      '@type': 'Article',
      headline: 'Welcome',
      author: { '@type': 'Person', name: 'Ann Author' },
      mainEntityOfPage: { '@type': 'WebPage', '@id': `${ORIGIN}/blog/welcome` },
    }
    const crumbs: JsonLdNode = {
      '@type': 'BreadcrumbList',
      itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${ORIGIN}/` }],
    }
    expect(values([article, crumbs])).toEqual(['Welcome', 'Ann Author', 'Home'])
  })
})

describe('findHiddenStrings', () => {
  const strings = () => collectCheckableStrings([organization, website, faq])

  it('passes when everything is on the page', () => {
    expect(findHiddenStrings(strings(), pageText)).toEqual([])
  })

  it('matches across whitespace, entities and case', () => {
    expect(
      findHiddenStrings(
        [{ property: 'Org.address', value: 'Newtown   NSW' }],
        'NEWTOWN&nbsp;nsw 2042',
      ),
    ).toEqual([])
  })

  // The deliberately broken fixture: structured data that claims things the page never shows.
  it('fails, naming the property, when the JSON-LD describes content that is not on the page', () => {
    const broken: JsonLdNode = {
      ...organization,
      name: 'Phantom Plumbing',
      address: { '@type': 'PostalAddress', streetAddress: '99 Nowhere Road' },
      openingHoursSpecification: [{ opens: '06:00', closes: '23:00' }],
    }
    const hidden = findHiddenStrings(collectCheckableStrings([broken, faq]), pageText)
    expect(hidden).toEqual([
      { property: 'ProfessionalService.name', value: 'Phantom Plumbing' },
      { property: 'ProfessionalService.address.streetAddress', value: '99 Nowhere Road' },
      { property: 'ProfessionalService.openingHoursSpecification[0].opens', value: '6:00 am' },
      { property: 'ProfessionalService.openingHoursSpecification[0].closes', value: '11:00 pm' },
    ])
  })

  it('fails for an FAQ answer the page does not show', () => {
    const hidden = findHiddenStrings(collectCheckableStrings([faq]), 'What do you do?')
    expect(hidden.map((s) => s.value)).toEqual(['We build websites.', 'And we host them.'])
  })
})

describe('findIdProblems', () => {
  it('accepts the same site nodes repeated on every page', () => {
    expect(
      findIdProblems({ '/': [organization, website], '/about': [organization, website] }),
    ).toEqual([])
  })

  it('ignores bare references', () => {
    expect(
      findIdProblems({
        '/': [{ '@id': `${ORIGIN}/#organization` }, { '@id': `${ORIGIN}/#organization` }],
      }),
    ).toEqual([])
  })

  it('reports an @id defined twice on one page', () => {
    expect(findIdProblems({ '/': [organization, organization] })).toEqual([
      `/: "${ORIGIN}/#organization" is defined twice on the page`,
    ])
  })

  it('reports one @id used for different things on different pages', () => {
    const other = { ...organization, name: 'Other Co' }
    expect(findIdProblems({ '/': [organization], '/about': [other] })).toEqual([
      `/about: "${ORIGIN}/#organization" is defined differently from /`,
    ])
  })
})

describe('findWebPageProblems', () => {
  const good: JsonLdNode = {
    '@type': 'Article',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${ORIGIN}/blog/welcome`,
      isPartOf: { '@id': `${ORIGIN}/#website` },
      publisher: { '@id': `${ORIGIN}/#organization` },
    },
  }

  it('accepts a WebPage that references the website and organisation', () => {
    expect(findWebPageProblems([good], ORIGIN)).toEqual([])
  })

  it('finds nothing to check on pages without a WebPage', () => {
    expect(findWebPageProblems([organization, website, faq], ORIGIN)).toEqual([])
  })

  it('fails for a WebPage with neither reference', () => {
    const broken: JsonLdNode = {
      '@type': 'Article',
      mainEntityOfPage: { '@type': 'WebPage', '@id': `${ORIGIN}/blog/welcome` },
    }
    expect(findWebPageProblems([broken], ORIGIN)).toEqual([
      `WebPage ${ORIGIN}/blog/welcome does not reference ${ORIGIN}/#website in isPartOf`,
      `WebPage ${ORIGIN}/blog/welcome does not reference ${ORIGIN}/#organization as publisher`,
    ])
  })

  it('fails when a reference points at another site', () => {
    const wrong: JsonLdNode = {
      '@type': 'WebPage',
      '@id': `${ORIGIN}/about`,
      isPartOf: { '@id': 'https://elsewhere.test/#website' },
      publisher: { '@id': `${ORIGIN}/#organization` },
    }
    expect(findWebPageProblems([wrong], ORIGIN)).toHaveLength(1)
  })
})
