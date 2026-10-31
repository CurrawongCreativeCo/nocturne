import { describe, expect, it } from 'vitest'

import { buildFaqPage } from './nodes/faq-page'
import { buildLocation } from './nodes/location'
import { buildPerson } from './nodes/person'
import {
  amountsIn,
  checkAgainstOwners,
  checkDescriptiveProvenance,
  checkParity,
  daysIn,
  datesIn,
  findDeniedClaims,
  foldAddress,
  foldName,
  phoneKey,
  timesIn,
} from './parity'

const origin = 'https://example.com.au'

const problems = (nodes: Record<string, unknown>[], text: string, extra = {}) =>
  checkParity(nodes, { origin, text, ...extra }).map(
    ({ property, reason }) => `${property} ${reason}`,
  )

describe('typed values', () => {
  it('reads 5:30 pm and 17:30 as the same time', () => {
    expect(timesIn('Open 8am – 5:30 pm')).toEqual(new Set([480, 1050]))
    expect(timesIn('Mon 17:30')).toEqual(new Set([1050]))
    expect(timesIn('12:00 am and 12:00 pm, noon')).toEqual(new Set([0, 720]))
  })

  it('reads +61 2 9000 0000 and (02) 9000 0000 as the same phone', () => {
    expect(phoneKey('+61 2 9000 0000')).toBe('+61290000000')
    expect(phoneKey('(02) 9000 0000')).toBe('+61290000000')
    expect(phoneKey('1300 123 456')).toBe('1300123456')
  })

  it('folds St to Street and New South Wales to NSW', () => {
    expect(foldAddress('1 King St, Newtown')).toBe(foldAddress('1 King Street, Newtown'))
    expect(foldAddress('Newtown New South Wales 2042')).toBe(foldAddress('Newtown NSW 2042'))
  })

  it('folds case, punctuation, diacritics and "&"', () => {
    expect(foldName('Café & Bar!')).toBe(foldName('CAFE and bar'))
  })

  it('expands day ranges, wrapping the week', () => {
    expect([...daysIn('Mon–Fri 8am')].sort()).toEqual([0, 1, 2, 3, 4])
    expect([...daysIn('Friday to Monday')].sort()).toEqual([0, 4, 5, 6])
    expect(daysIn('Open daily').size).toBe(7)
  })

  it('reads dates written the Australian ways', () => {
    expect(datesIn('Sat 14 March 2026')).toContainEqual({ year: 2026, month: 3, day: 14 })
    expect(datesIn('14/03/2026')).toContainEqual({ year: 2026, month: 3, day: 14 })
    expect(datesIn('March 14')).toContainEqual({ month: 3, day: 14 })
  })

  it('reads amounts', () => {
    expect(amountsIn('From $1,200.50 or A$99 / AUD 5')).toEqual([1200.5, 99, 5])
  })
})

describe('visible facts', () => {
  const business = {
    '@type': 'Plumber',
    '@id': `${origin}/#organization`,
    name: 'Acme & Sons',
    telephone: '+61290000000',
    email: 'hello@acme.com.au',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '1 King St',
      addressLocality: 'Newtown',
      addressRegion: 'NSW',
      postalCode: '2042',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:00',
        closes: '17:30',
      },
    ],
  }
  const shown = `
    Acme and Sons
    Call (02) 9000 0000 or email hello@acme.com.au
    1 King Street, Newtown New South Wales 2042
    Mon–Fri 8:00 am – 5:30 pm`

  it('passes when the page shows the same values in other forms', () => {
    expect(problems([business], shown)).toEqual([])
  })

  it('reports a different phone, address, day or time', () => {
    const other = shown
      .replace('9000 0000', '9111 1111')
      .replace('King Street', 'Queen Street')
      .replace('Mon–Fri', 'Mon–Thu')
      .replace('5:30 pm', '6:00 pm')
    const found = problems([business], other).join('\n')
    expect(found).toContain('Plumber.telephone')
    expect(found).toContain('Plumber.address.streetAddress')
    expect(found).toContain('dayOfWeek')
    expect(found).toContain('closes')
  })

  it('skips the business details on a minimal page but still checks the name', () => {
    expect(problems([business], 'Acme and Sons', { siteDetails: false })).toEqual([])
    expect(problems([business], 'Something else', { siteDetails: false })).toHaveLength(1)
  })

  it('does not check dated special days against the weekly hours', () => {
    const special = {
      '@type': 'Plumber',
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          opens: '00:00',
          closes: '00:00',
          validFrom: '2026-12-25',
          validThrough: '2026-12-25',
        },
      ],
    }
    expect(problems([special], 'Closed on Christmas')).toEqual([])
  })

  it('compares event dates and times as dates and times', () => {
    const event = {
      '@type': 'Event',
      name: 'Pottery',
      startDate: '2026-03-14T10:00:00+11:00',
      endDate: '2026-03-14T12:00:00+11:00',
    }
    expect(problems([event], 'Pottery Saturday 14 March, 10:00 am – 12:00 pm')).toEqual([])
    expect(problems([event], 'Pottery Saturday 15 March, 10:00 am – 12:00 pm')).toHaveLength(2)
  })

  it('compares an event place address as a string', () => {
    const event = {
      '@type': 'Event',
      location: { '@type': 'Place', address: '12 Rose St, Newtown NSW 2042' },
    }
    expect(problems([event], '12 Rose Street Newtown NSW 2042')).toEqual([])
  })

  it('checks a price as amount plus currency', () => {
    const service = {
      '@type': 'Service',
      offers: { '@type': 'Offer', price: '99', priceCurrency: 'AUD' },
    }
    expect(problems([service], 'From $99')).toEqual([])
    expect(problems([service], 'From $89')[0]).toContain('price')
    const usd = {
      '@type': 'Service',
      offers: { '@type': 'Offer', price: '99', priceCurrency: 'USD' },
    }
    expect(problems([usd], 'From $99').join()).toContain('priceCurrency')
  })
})

describe('descriptive text', () => {
  const org = { '@type': 'Organization', '@id': `${origin}/#organization`, name: 'Acme' }

  it('may be truncated or lose its formatting', () => {
    const article = {
      '@type': 'Article',
      description: 'Plumbing tips for old houses, from our team in...',
    }
    expect(problems([article], 'Plumbing tips for old houses, from our team in Newtown.')).toEqual(
      [],
    )
  })

  it('must come from text the page shows', () => {
    const article = { '@type': 'Article', description: 'A completely different summary.' }
    expect(problems([article], 'Plumbing tips for old houses.')[0]).toContain('Article.description')
  })

  it('is checked for the site nodes against the whole site', () => {
    const website = {
      '@type': 'WebSite',
      '@id': `${origin}/#website`,
      description: 'Plumbers in Newtown.',
    }
    expect(problems([website], 'Nothing here')).toHaveLength(1)
    expect(problems([website], 'Nothing here', { siteText: 'Plumbers in Newtown.' })).toEqual([])
    expect(problems([org], 'Acme')).toEqual([])
  })

  it('treats a WebPage name as the page title', () => {
    const page = { '@type': 'WebPage', name: 'Our team' }
    expect(problems([page], 'Our team | Acme')).toEqual([])
    expect(problems([page], 'Contact')).toHaveLength(1)
  })
})

describe('reach and technical properties', () => {
  it('needs areaServed to be stated somewhere on the site, not on this page', () => {
    const org = { '@type': 'Plumber', areaServed: [{ '@type': 'Place', name: 'Inner West' }] }
    expect(problems([org], 'Home', { siteText: 'We cover the Inner West.' })).toEqual([])
    expect(problems([org], 'Home', { siteText: 'We cover Sydney.' })[0]).toContain('areaServed')
  })

  it('exempts identity and technical properties from visibility but checks they are valid', () => {
    const ok = {
      '@type': 'Plumber',
      url: 'https://example.com.au/',
      sameAs: ['https://facebook.com/acme'],
      geo: { latitude: -33.9, longitude: 151.2 },
    }
    expect(problems([ok], '')).toEqual([])
    const bad = { '@type': 'Plumber', url: '/about', geo: { latitude: 33.9, longitude: 151.2 } }
    const found = problems([bad], '').join('\n')
    expect(found).toContain('url must be an absolute URL')
    expect(found).toContain('geo')
  })

  it('reports an organisation type that is not the business type', () => {
    const org = { '@type': 'LocalBusiness', '@id': `${origin}/#organization` }
    expect(problems([org], '', { businessType: 'Plumber' })[0]).toContain('business type Plumber')
  })
})

describe('deny list', () => {
  const denied = (nodes: Record<string, unknown>[], text = '') =>
    findDeniedClaims(nodes, { text }).map(({ reason }) => reason)

  it('rejects self-serving ratings and reviews', () => {
    expect(
      denied([{ '@type': 'Plumber', aggregateRating: { '@type': 'AggregateRating' } }]).length,
    ).toBeGreaterThan(0)
    expect(
      denied([{ '@type': 'Article', review: [{ '@type': 'Review' }] }]).length,
    ).toBeGreaterThan(0)
  })

  it('rejects an offer whose price the page does not show, and accepts one it does', () => {
    const service = { '@type': 'Service', offers: { '@type': 'Offer', price: 99 } }
    expect(denied([service], 'Call us')).toEqual(['an offer needs a price the page shows'])
    expect(denied([service], 'From $99')).toEqual([])
  })

  it('allows a registration offer, which makes no claim about price', () => {
    const event = {
      '@type': 'Event',
      offers: { '@type': 'Offer', url: 'https://example.com.au/book' },
    }
    expect(denied([event])).toEqual([])
  })

  it('rejects a product without a visible priced offer', () => {
    expect(denied([{ '@type': 'Product', name: 'Pipe' }])).toHaveLength(1)
  })

  it('rejects FAQs that are not on the page, and accepts a closed accordion answer', () => {
    const { node } = buildFaqPage({
      url: `${origin}/faq`,
      doc: 'page-faq',
      questions: [{ question: 'Do you quote?', answer: 'Yes, for free.', field: 'items[0]' }],
    })
    expect(denied([node], 'Do you quote? Yes, for free.')).toEqual([])
    expect(denied([node], 'Do you quote?')).toEqual(['this FAQ answer is not on the page'])
    expect(denied([node], 'Contact us')).toHaveLength(2)
  })

  it('rejects credentials the page does not show', () => {
    const { node } = buildPerson({
      origin,
      id: 'abc',
      name: 'Sam',
      credentials: ['Cert IV Plumbing'],
    })
    expect(denied([node], 'Sam, Cert IV Plumbing')).toEqual([])
    expect(denied([node], 'Sam')).toEqual(['this credential is not shown on the page'])
  })
})

describe('provenance', () => {
  const built = buildPerson({
    origin,
    id: 'abc',
    name: 'Sam Lee',
    description: 'Sam runs the studio.',
    telephone: '+61290000000',
  })

  it('passes when the description is entered in a field the page renders', () => {
    expect(checkDescriptiveProvenance(built, [{ doc: 'abc', field: 'shortBio' }])).toEqual([])
  })

  it('reports a description from a field the page does not render', () => {
    const found = checkDescriptiveProvenance(built, [{ doc: 'abc', field: 'bio' }])
    expect(found).toHaveLength(1)
    expect(found[0]?.reason).toContain('abc.shortBio')
  })

  it('reports a JSON-LD value that differs from its owning field, by type', () => {
    const owners = {
      'abc.name': 'Sam Lee',
      'abc.phone': '(02) 9000 0000',
      'abc.shortBio': 'Sam runs the studio.',
    }
    const owner = ({ doc, field }: { doc: string; field: string }) =>
      owners[`${doc}.${field}` as keyof typeof owners]
    expect(checkAgainstOwners(built, owner)).toEqual([])
    const changed = { ...owners, 'abc.phone': '(02) 9111 1111', 'abc.name': 'Samuel Lee' }
    const found = checkAgainstOwners(
      built,
      ({ doc, field }) => changed[`${doc}.${field}` as keyof typeof changed],
    )
    expect(found.map(({ property }) => property).sort()).toEqual(['name', 'telephone'])
  })
})

describe('provenance is not visibility', () => {
  const built = buildPerson({
    origin,
    id: 'abc',
    name: 'Sam Lee',
    description: 'Sam runs the studio.',
    telephone: '+61290000000',
    email: 'sam@example.com.au',
  })
  const owners: Record<string, string> = {
    'abc.name': 'Sam Lee',
    'abc.shortBio': 'Sam runs the studio.',
    'abc.phone': '02 9000 0000',
    'abc.publicEmail': 'sam@example.com.au',
  }
  const owner = ({ doc, field }: { doc: string; field: string }) => owners[`${doc}.${field}`]

  it('a fact with a source that agrees with its owning field still fails when the page does not show it', () => {
    // 1 and 2 hold: a recorded source, and agreement with the owning field.
    expect(Object.keys(built.provenance)).toContain('telephone')
    expect(checkAgainstOwners(built, owner)).toEqual([])
    // 3 does not: nothing rendered.
    const found = problems([built.node], 'Sam Lee')
    expect(found.join('\n')).toContain('Person.telephone')
    expect(found.join('\n')).toContain('Person.email')
    expect(found.join('\n')).toContain('Person.description')
  })

  it('passes once the same facts are rendered, in any form a visitor can reach', () => {
    const text = 'Sam Lee\nSam runs the studio.\nCall (02) 9000 0000\nsam@example.com.au'
    expect(problems([built.node], text)).toEqual([])
  })

  it('a description whose source field is not rendered fails even though it is recorded', () => {
    expect(built.provenance.description).toBeDefined()
    expect(checkDescriptiveProvenance(built, [])).toHaveLength(1)
  })
})

describe('service areas', () => {
  const org = (areas?: string[]) => ({
    '@type': 'Plumber',
    ...(areas && { areaServed: areas.map((name) => ({ '@type': 'Place', name })) }),
  })

  it('passes when the areas are stated on the site', () => {
    expect(
      problems([org(['Inner West'])], 'Home', { siteText: 'We serve the Inner West.' }),
    ).toEqual([])
  })

  it('has nothing to check when the markup is absent', () => {
    expect(problems([org()], 'Home', { siteText: 'Nothing' })).toEqual([])
  })

  it('fails when the areas are in the markup but rendered nowhere', () => {
    const found = problems([org(['Inner West', 'Newcastle'])], 'Home', {
      siteText: 'We serve Sydney.',
    })
    expect(found).toHaveLength(2)
    expect(found[0]).toContain('areaServed')
  })
})

describe('locations', () => {
  const branch = buildLocation({
    origin,
    id: 'place-1',
    url: `${origin}/locations/parramatta`,
    name: 'Parramatta',
    kind: 'branch',
    businessType: 'Plumber',
    summary: 'Our Parramatta branch.',
    phone: '(02) 9000 0000',
    address: { street: '1 Church St', suburb: 'Parramatta', state: 'NSW', postcode: '2150' },
    geo: { lat: -33.8151, lng: 151.0011 },
    openingHours: [{ days: ['mon', 'tue', 'wed', 'thu', 'fri'], opens: '07:00', closes: '17:00' }],
    today: '2026-10-31',
  })
  const shown =
    'Parramatta\nOur Parramatta branch.\n1 Church St\nParramatta NSW 2150\nPhone (02) 9000 0000\nMon–Fri 7:00 am – 5:00 pm'

  it('passes when a branch shows its name, summary, address, phone and hours', () => {
    expect(problems([branch.node], shown)).toEqual([])
    expect(checkDescriptiveProvenance(branch, [{ doc: 'place-1', field: 'summary' }])).toEqual([])
  })

  it('fails a branch fact the page does not show', () => {
    const found = problems([branch.node], 'Parramatta\nOur Parramatta branch.').join('\n')
    expect(found).toContain('telephone')
    expect(found).toContain('address')
    expect(found).toContain('openingHoursSpecification')
  })

  it('fails a summary that the page does not render', () => {
    expect(checkDescriptiveProvenance(branch, [])).toHaveLength(1)
  })

  it('passes a service area that shows its name, and fails one that does not', () => {
    const area = buildLocation({
      origin,
      id: 'place-2',
      url: `${origin}/locations/western-sydney`,
      name: 'Western Sydney',
      kind: 'serviceArea',
      businessType: 'Plumber',
      today: '2026-10-31',
    })
    expect(problems([area.node], 'Western Sydney')).toEqual([])
    expect(problems([area.node], 'Somewhere else').join('\n')).toContain('name')
  })

  it('has nothing to check on a service that names its locations by @id', () => {
    const service = {
      '@type': 'Service',
      name: 'Plumbing',
      areaServed: [{ '@id': `${origin}/#location-place-1` }],
    }
    expect(problems([service], 'Plumbing')).toEqual([])
  })
})
