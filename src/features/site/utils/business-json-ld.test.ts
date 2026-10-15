import { describe, expect, it } from 'vitest'

import {
  buildLocalBusinessJsonLd,
  businessSchemaType,
  type BusinessInfoData,
} from './business-json-ld'

const options = {
  url: 'https://example.com.au/',
  id: 'https://example.com.au/#organization',
  name: 'Site name',
  today: '2026-10-15',
}

const full: BusinessInfoData = {
  tradingName: 'Acme Plumbing',
  legalName: 'Acme Holdings Pty Ltd',
  phone: '(02) 9876 5432',
  publicEmail: 'hello@acme.com.au',
  address: { street: '1 King Street', suburb: 'Newtown', state: 'NSW', postcode: '2042' },
  businessType: 'HomeAndConstructionBusiness',
  geo: { lat: -33.8978, lng: 151.1788 },
  openingHours: [
    { days: ['mon', 'tue', 'wed', 'thu', 'fri'], opens: '08:00', closes: '17:30' },
    { days: ['sat'], opens: '09:00', closes: '13:00' },
    { days: ['sun'], closed: true },
  ],
  specialHours: [
    { date: '2026-01-26', closed: true, note: 'Australia Day' },
    { date: '2026-12-25', closed: true, note: 'Christmas Day' },
    { date: '2026-12-24', opens: '09:00', closes: '12:00' },
  ],
  serviceAreas: ['Inner West', 'Newcastle'],
  socialLinks: [{ url: 'https://facebook.com/acme' }, { url: 'https://instagram.com/acme' }],
  priceRange: '$$',
}

describe('buildLocalBusinessJsonLd', () => {
  it('emits the chosen subtype with every filled-in field', () => {
    expect(buildLocalBusinessJsonLd(full, options)).toEqual({
      '@type': 'HomeAndConstructionBusiness',
      '@id': 'https://example.com.au/#organization',
      name: 'Acme Plumbing',
      legalName: 'Acme Holdings Pty Ltd',
      url: 'https://example.com.au/',
      telephone: '+61298765432',
      email: 'hello@acme.com.au',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '1 King Street',
        addressLocality: 'Newtown',
        addressRegion: 'NSW',
        postalCode: '2042',
        addressCountry: 'AU',
      },
      geo: { '@type': 'GeoCoordinates', latitude: -33.8978, longitude: 151.1788 },
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          opens: '08:00',
          closes: '17:30',
        },
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Saturday'],
          opens: '09:00',
          closes: '13:00',
        },
        {
          '@type': 'OpeningHoursSpecification',
          opens: '09:00',
          closes: '12:00',
          validFrom: '2026-12-24',
          validThrough: '2026-12-24',
        },
        {
          '@type': 'OpeningHoursSpecification',
          opens: '00:00',
          closes: '00:00',
          validFrom: '2026-12-25',
          validThrough: '2026-12-25',
        },
      ],
      areaServed: [
        { '@type': 'Place', name: 'Inner West' },
        { '@type': 'Place', name: 'Newcastle' },
      ],
      sameAs: ['https://facebook.com/acme', 'https://instagram.com/acme'],
      priceRange: '$$',
    })
  })

  it('emits only what exists, falling back to LocalBusiness and the site name', () => {
    expect(buildLocalBusinessJsonLd({ address: { suburb: 'Fremantle' } }, options)).toEqual({
      '@type': 'LocalBusiness',
      '@id': 'https://example.com.au/#organization',
      name: 'Site name',
      url: 'https://example.com.au/',
      address: { '@type': 'PostalAddress', addressLocality: 'Fremantle', addressCountry: 'AU' },
    })
  })

  it('leaves out an incomplete geo pair and a phone number it cannot parse', () => {
    const node = buildLocalBusinessJsonLd(
      { geo: { lat: -33.9, lng: null }, phone: 'call us' },
      options,
    )
    expect(node).not.toHaveProperty('geo')
    expect(node).not.toHaveProperty('telephone')
  })

  it('includes the logo when there is one', () => {
    expect(
      buildLocalBusinessJsonLd({}, { ...options, logo: 'https://cdn/logo.png' }),
    ).toMatchObject({ logo: 'https://cdn/logo.png' })
  })
})

describe('businessSchemaType', () => {
  it('uses the typed name for "Other" when it is a usable type', () => {
    expect(businessSchemaType({ businessType: 'Other', businessTypeOther: 'Optician' })).toBe(
      'Optician',
    )
  })

  it('falls back to LocalBusiness for a missing or unusable value', () => {
    expect(businessSchemaType({})).toBe('LocalBusiness')
    expect(businessSchemaType({ businessType: 'Other' })).toBe('LocalBusiness')
    expect(businessSchemaType({ businessType: 'Other', businessTypeOther: 'my shop' })).toBe(
      'LocalBusiness',
    )
    expect(businessSchemaType({ businessType: '<script>' })).toBe('LocalBusiness')
  })
})
