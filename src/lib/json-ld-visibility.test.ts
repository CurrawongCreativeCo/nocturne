import { describe, expect, it } from 'vitest'

import {
  findDraftIds,
  findIdProblems,
  findMissingWebPage,
  findUnresolvedReferences,
  findWebPageProblems,
  siteGraphIds,
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
      `/about: "${ORIGIN}/#organization" has a different name from /`,
    ])
  })

  it('accepts a shorter definition of an entity that agrees with the full one', () => {
    const full = {
      '@type': 'Person',
      '@id': `${ORIGIN}/#person-a`,
      name: 'Sam',
      jobTitle: 'Director',
    }
    const byline = { '@type': 'Person', '@id': `${ORIGIN}/#person-a`, name: 'Sam' }
    expect(findIdProblems({ '/team/sam': [full], '/blog/hello': [byline] })).toEqual([])
  })
})

describe('findMissingWebPage', () => {
  it('wants a WebPage keyed by the page URL', () => {
    const page = { '@type': 'WebPage', '@id': `${ORIGIN}/about#webpage` }
    expect(findMissingWebPage([organization, page], `${ORIGIN}/about`)).toEqual([])
    expect(findMissingWebPage([organization], `${ORIGIN}/about`)).toEqual([
      `no WebPage node with the @id ${ORIGIN}/about#webpage`,
    ])
  })
})

describe('graph integrity', () => {
  const siteGraph = siteGraphIds([
    [organization, website],
    [organization, website, faq],
  ])

  it('takes the site graph from the nodes every page carries', () => {
    expect(siteGraph).toEqual(new Set([`${ORIGIN}/#organization`, `${ORIGIN}/#website`]))
  })

  it('resolves references to nodes on the page and in the site graph', () => {
    const page = {
      '@type': 'WebPage',
      '@id': `${ORIGIN}/a#webpage`,
      isPartOf: { '@id': `${ORIGIN}/#website` },
      about: { '@id': `${ORIGIN}/#article-1` },
    }
    const article = {
      '@type': 'Article',
      '@id': `${ORIGIN}/#article-1`,
      publisher: { '@id': `${ORIGIN}/#organization` },
    }
    expect(findUnresolvedReferences([page, article], siteGraph)).toEqual([])
  })

  it('reports a reference nothing defines', () => {
    const article = {
      '@type': 'Article',
      '@id': `${ORIGIN}/#article-1`,
      author: { '@id': `${ORIGIN}/#person-x` },
    }
    expect(findUnresolvedReferences([article], siteGraph)).toEqual([
      `"${ORIGIN}/#person-x" is referenced but no node on the page or in the site graph defines it`,
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

describe('graph integrity: negative cases', () => {
  const siteGraph = new Set([`${ORIGIN}/#organization`, `${ORIGIN}/#website`])
  const article = (extra: JsonLdNode): JsonLdNode => ({
    '@type': 'Article',
    '@id': `${ORIGIN}/#article-1`,
    ...extra,
  })

  it('fails an intentionally broken internal reference', () => {
    const broken = article({ author: { '@id': `${ORIGIN}/#person-missing` } })
    expect(findUnresolvedReferences([broken], siteGraph)).toHaveLength(1)
  })

  it('fails a broken Person reference from an Article, and passes it once the Person is defined', () => {
    const byline = article({ author: { '@id': `${ORIGIN}/#person-a` } })
    expect(findUnresolvedReferences([byline], siteGraph)).toHaveLength(1)
    const person = { '@type': 'Person', '@id': `${ORIGIN}/#person-a`, name: 'Sam' }
    expect(findUnresolvedReferences([byline, person], siteGraph)).toEqual([])
  })

  it('fails organisation and website references to another origin', () => {
    const wrong = article({
      publisher: { '@id': 'https://elsewhere.test/#organization' },
      isPartOf: { '@id': `${ORIGIN}/#websit` },
    })
    expect(findUnresolvedReferences([wrong], siteGraph)).toHaveLength(2)
  })

  it('fails a WebPage reference to a page node that is not there', () => {
    const lonely = article({ mainEntityOfPage: { '@id': `${ORIGIN}/blog/a#webpage` } })
    expect(findUnresolvedReferences([lonely], siteGraph)).toHaveLength(1)
  })

  it('fails an id built from a draft or release-version document id', () => {
    const drafts = article({
      '@id': `${ORIGIN}/#article-drafts.1`,
      author: { '@id': `${ORIGIN}/#person-versions.rSummer.a` },
    })
    expect(findDraftIds([drafts])).toHaveLength(2)
    expect(findDraftIds([article({ author: { '@id': `${ORIGIN}/#person-a` } })])).toEqual([])
  })

  it('fails one @id carrying contradictory facts on two pages', () => {
    const one = { '@type': 'Person', '@id': `${ORIGIN}/#person-a`, name: 'Sam' }
    const two = { ...one, name: 'Samuel' }
    expect(findIdProblems({ '/a': [one], '/b': [two] })).toHaveLength(1)
  })
})
