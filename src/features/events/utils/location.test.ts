import { describe, expect, it } from 'vitest'

import { directionsUrl, locationText } from './location'

describe('locationText', () => {
  it('joins the venue and its address on one line', () => {
    expect(
      locationText({ kind: 'venue', name: 'The Studio', address: '12 Rose St\nNewtown NSW 2042' }),
    ).toBe('The Studio, 12 Rose St, Newtown NSW 2042')
  })

  it('uses whatever of the venue is given', () => {
    expect(locationText({ kind: 'venue', name: 'The Studio' })).toBe('The Studio')
    expect(locationText({ kind: 'venue', address: '12 Rose St' })).toBe('12 Rose St')
    expect(locationText({ kind: 'venue' })).toBeNull()
    expect(locationText(null)).toBeNull()
  })

  it('gives the joining link for an online event, or just "Online"', () => {
    expect(locationText({ kind: 'online', url: 'https://meet.example.com/abc' })).toBe(
      'https://meet.example.com/abc',
    )
    expect(locationText({ kind: 'online' })).toBe('Online')
  })
})

describe('directionsUrl', () => {
  it('searches Google Maps for the venue', () => {
    const url = new URL(
      directionsUrl({ kind: 'venue', name: 'The Studio', address: '12 Rose St' }) ?? '',
    )
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/search/')
    expect(url.searchParams.get('query')).toBe('The Studio, 12 Rose St')
  })

  it('has none for an online event or no place', () => {
    expect(directionsUrl({ kind: 'online', url: 'https://x.test' })).toBeNull()
    expect(directionsUrl({ kind: 'venue' })).toBeNull()
  })
})
