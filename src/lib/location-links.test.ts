import { describe, expect, it } from 'vitest'

import type { LocationBusiness } from '@/types/business'

import { addressLines, directionsUrl, embedUrl, mapQuery } from './location-links'

const address: LocationBusiness['address'] = {
  street: '1 King Street',
  suburb: 'Newtown',
  state: 'NSW',
  postcode: '2042',
}

describe('addressLines', () => {
  it('gives the street, then the locality', () => {
    expect(addressLines(address)).toEqual(['1 King Street', 'Newtown NSW 2042'])
  })

  it('leaves out the street for a mobile or home-based business', () => {
    expect(addressLines({ ...address, street: null })).toEqual(['Newtown NSW 2042'])
  })

  it('is empty without an address', () => {
    expect(addressLines(null)).toEqual([])
    expect(addressLines({ street: null, suburb: null, state: null, postcode: null })).toEqual([])
  })
})

describe('mapQuery', () => {
  it('uses the coordinates when they are set', () => {
    expect(mapQuery({ address, geo: { lat: -33.8978, lng: 151.1788 } })).toBe('-33.8978,151.1788')
  })

  it('accepts a coordinate of zero', () => {
    expect(mapQuery({ address: null, geo: { lat: 0, lng: 0 } })).toBe('0,0')
  })

  it('falls back to the whole address, in Australia', () => {
    expect(mapQuery({ address, geo: null })).toBe('1 King Street, Newtown NSW 2042, Australia')
  })

  it('has nothing to point at without either', () => {
    expect(mapQuery({ address: null, geo: null })).toBeNull()
    expect(mapQuery({ address: null, geo: { lat: -33, lng: null } })).toBeNull()
  })
})

describe('directionsUrl and embedUrl', () => {
  it('encodes the address', () => {
    expect(directionsUrl({ address, geo: null })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=1%20King%20Street%2C%20Newtown%20NSW%202042%2C%20Australia',
    )
    expect(embedUrl({ address, geo: null })).toBe(
      'https://www.google.com/maps?q=1%20King%20Street%2C%20Newtown%20NSW%202042%2C%20Australia&z=15&output=embed',
    )
  })

  it('encodes characters that would break out of the query', () => {
    const url = directionsUrl({ address: { ...address, street: '1 A&B St #2' }, geo: null })
    expect(url).toContain('1%20A%26B%20St%20%232')
    expect(new URL(url ?? '').searchParams.get('destination')).toBe(
      '1 A&B St #2, Newtown NSW 2042, Australia',
    )
  })

  it('uses the coordinates when set', () => {
    expect(directionsUrl({ address: null, geo: { lat: -33.8978, lng: 151.1788 } })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=-33.8978%2C151.1788',
    )
  })

  it('is null without a place', () => {
    expect(directionsUrl({ address: null, geo: null })).toBeNull()
    expect(embedUrl({ address: null, geo: null })).toBeNull()
  })
})
