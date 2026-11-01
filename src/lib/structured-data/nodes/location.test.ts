import { describe, expect, it } from 'vitest'

import { buildLocation, buildLocationReference, type LocationInput } from './location'

const ORIGIN = 'https://example.com.au'
const URL = `${ORIGIN}/locations/parramatta`
const base: LocationInput = {
  origin: ORIGIN,
  id: 'location-9d3f02be',
  url: URL,
  name: 'Example Plumbing, Parramatta',
  kind: 'branch',
  businessType: 'Plumber',
  today: '2026-10-31',
}

describe('buildLocation: a branch', () => {
  it('is the business type, keyed by document, with the organisation as its parent', () => {
    const { node } = buildLocation(base)
    expect(node).toEqual({
      '@type': 'Plumber',
      '@id': `${ORIGIN}/#location-location-9d3f02be`,
      name: 'Example Plumbing, Parramatta',
      url: URL,
      parentOrganization: { '@id': `${ORIGIN}/#organization` },
    })
  })

  it('keeps the @id when the slug changes, and never emits a draft or release-version id', () => {
    const before = buildLocation(base).node['@id']
    for (const id of ['drafts.location-9d3f02be', 'versions.rSummer.location-9d3f02be']) {
      const moved = buildLocation({ ...base, id, url: `${ORIGIN}/locations/parra` })
      expect(moved.node['@id']).toBe(before)
      expect(JSON.stringify(moved.node)).not.toMatch(/drafts\.|versions\./)
    }
  })

  it('emits the address, phone, coordinates and hours it was given, as typed values', () => {
    const { node, provenance } = buildLocation({
      ...base,
      phone: '(02) 9000 0000',
      publicEmail: 'parra@example.com.au',
      address: { street: '1 Church St', suburb: 'Parramatta', state: 'NSW', postcode: '2150' },
      geo: { lat: -33.8151, lng: 151.0011 },
      openingHours: [
        { days: ['mon', 'tue', 'wed', 'thu', 'fri'], opens: '07:00', closes: '17:00' },
      ],
      specialHours: [{ date: '2026-12-25', closed: true }],
    })
    expect(node).toMatchObject({
      telephone: '+61290000000',
      email: 'parra@example.com.au',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '1 Church St',
        addressLocality: 'Parramatta',
        addressRegion: 'NSW',
        postalCode: '2150',
        addressCountry: 'AU',
      },
      geo: { '@type': 'GeoCoordinates', latitude: -33.8151, longitude: 151.0011 },
    })
    expect(node.openingHoursSpecification).toEqual([
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '07:00',
        closes: '17:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        opens: '00:00',
        closes: '00:00',
        validFrom: '2026-12-25',
        validThrough: '2026-12-25',
      },
    ])
    expect(provenance.telephone).toEqual({ doc: 'location-9d3f02be', field: 'phone' })
    expect(provenance['address.addressLocality']).toEqual({
      doc: 'location-9d3f02be',
      field: 'address.suburb',
    })
  })

  it('leaves out what the editor left empty, and special days that have passed', () => {
    const { node } = buildLocation({
      ...base,
      phone: '',
      address: { street: null, suburb: null },
      geo: { lat: -33.8, lng: null },
      specialHours: [{ date: '2026-01-01', closed: true }],
    })
    for (const key of ['telephone', 'email', 'address', 'geo', 'openingHoursSpecification'])
      expect(node).not.toHaveProperty(key)
  })

  it('claims no rating, review, area served or offer', () => {
    const { node } = buildLocation({ ...base, summary: 'Our Parramatta branch.' })
    for (const key of ['aggregateRating', 'review', 'areaServed', 'offers'])
      expect(node).not.toHaveProperty(key)
  })
})

describe('buildLocation: a service area', () => {
  const area: LocationInput = {
    ...base,
    id: 'location-western-sydney',
    url: `${ORIGIN}/locations/western-sydney`,
    name: 'Western Sydney',
    kind: 'serviceArea',
  }

  it('is a Place with a name and a page', () => {
    expect(
      buildLocation({ ...area, summary: 'From Parramatta to the Blue Mountains.' }).node,
    ).toEqual({
      '@type': 'Place',
      '@id': `${ORIGIN}/#location-location-western-sydney`,
      name: 'Western Sydney',
      url: `${ORIGIN}/locations/western-sydney`,
      description: 'From Parramatta to the Blue Mountains.',
    })
  })

  it('emits no address, phone, hours or parent even when the document still holds them', () => {
    const { node } = buildLocation({
      ...area,
      phone: '(02) 9000 0000',
      publicEmail: 'a@example.com.au',
      address: { suburb: 'Parramatta', state: 'NSW', postcode: '2150' },
      geo: { lat: -33.8, lng: 151 },
      openingHours: [{ days: ['mon'], opens: '07:00', closes: '17:00' }],
    })
    for (const key of [
      'telephone',
      'email',
      'address',
      'geo',
      'openingHoursSpecification',
      'parentOrganization',
    ])
      expect(node).not.toHaveProperty(key)
  })
})

describe('buildLocationReference', () => {
  it('carries the full node’s @id and type with only a name and a page', () => {
    for (const [kind, type] of [
      ['branch', 'Plumber'],
      ['serviceArea', 'Place'],
    ] as const) {
      const input = { ...base, kind }
      const stub = buildLocationReference(input).node
      expect(stub).toEqual({
        '@type': type,
        '@id': buildLocation(input).node['@id'],
        name: 'Example Plumbing, Parramatta',
        url: URL,
      })
      expect(stub['@type']).toBe(buildLocation(input).node['@type'])
    }
  })
})
