import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { parseHtml } from '@/lib/design/capability-harness'
import type * as LocationLinks from '@/lib/location-links'
import type { LocationBusiness } from '@/types/business'

import { Location } from '.'
import type { SectionOf } from '../../../types'

/**
 * The content sources `location.addressCard` and `location.directionsLink` (task 275;
 * src/lib/design/capability-evidence.ts): what the Location section draws from Business info, apart
 * from the optional map. These are the sources' own tests: what each draws from what is stored, what
 * each draws nothing without, and that cutting the resolver each comes through removes it
 * (`@/lib/location-links`). The click-to-load map is in click-to-load.test.tsx.
 */

vi.mock('next-sanity/image', () => ({ Image: () => null }))
vi.mock('@/config/env', () => ({
  projectId: 'e2etest1',
  dataset: 'production',
  apiVersion: '2026-10-01',
  siteLanguage: 'en',
  studioUrl: '/studio',
}))

// Each resolver can be cut off on its own.
const off = vi.hoisted(() => ({ addressLines: false, directionsUrl: false }))
vi.mock('@/lib/location-links', async (load) => {
  const actual = await load<typeof LocationLinks>()
  return {
    ...actual,
    addressLines: (address: Parameters<typeof actual.addressLines>[0]) =>
      off.addressLines ? [] : actual.addressLines(address),
    directionsUrl: (place: Parameters<typeof actual.directionsUrl>[0]) =>
      off.directionsUrl ? null : actual.directionsUrl(place),
  }
})

const business: LocationBusiness = {
  tradingName: 'Test Co',
  phone: '(02) 9876 5432',
  phoneHref: '+61298765432',
  publicEmail: 'hello@example.com',
  address: { street: '1 King Street', suburb: 'Newtown', state: 'NSW', postcode: '2042' },
  geo: null,
  timeZone: 'Australia/Sydney',
  openingHours: [
    { _key: 'a', days: ['mon', 'tue'], opens: '08:00', closes: '17:30', closed: null },
  ],
  specialHours: null,
  socialLinks: null,
  specialDays: [],
}

const section = (extra: object = {}) =>
  ({
    _key: 'l',
    _type: 'location',
    access: null,
    style: null,
    title: 'Visit us',
    intro: null,
    mapImage: null,
    showHours: true,
    showOpenNow: true,
    showContact: true,
    directionsLabel: 'Get directions',
    interactiveMap: false,
    ...extra,
  }) as unknown as SectionOf<'location'>

const MAP_IMAGE = {
  alt: 'A map',
  asset: {
    _id: 'image-abc-1200x800-jpg',
    metadata: { lqip: null, hasAlpha: false, dimensions: { width: 1200, height: 800 } },
  },
}

const draw = (data = section(), place: LocationBusiness | null = business) =>
  parseHtml(renderToStaticMarkup(<Location data={data} business={place} />))

const DESTINATION = 'https://www.google.com/maps/dir/?api=1&destination='

describe('location.addressCard: the address from Business info', () => {
  it('draws the address card from Business info', () => {
    const address = draw().querySelector('address')
    expect(address?.textContent).toContain('Test Co')
    expect(address?.textContent).toContain('1 King Street')
    expect(address?.textContent).toContain('Newtown NSW 2042')
    expect(address?.closest('div')?.parentElement?.querySelector('h3')?.textContent).toContain(
      'Address',
    )
    // What is typed in the section isn't the address: it all comes from Business info.
    expect(
      draw(section(), { ...business, tradingName: 'Other Co' }).querySelector('address')
        ?.textContent,
    ).toContain('Other Co')
  })

  it('puts the address on a card only when there is no map image', () => {
    expect(draw().querySelector('address')?.closest('.rounded-card')).not.toBeNull()
    const withPicture = draw(section({ mapImage: MAP_IMAGE }))
    expect(withPicture.querySelector('address')).not.toBeNull()
    expect(withPicture.querySelector('address')?.closest('.rounded-card')).toBeNull()
  })

  it('draws no address card without an address', () => {
    const noAddress = draw(section(), { ...business, address: null })
    expect(noAddress.querySelector('address')).toBeNull()
    // The rest of Business info still shows.
    expect(noAddress.body.textContent).toContain('hello@example.com')
  })

  it('draws no address once the address lines are disconnected', () => {
    off.addressLines = true
    try {
      const cut = draw()
      expect(cut.querySelector('address')).toBeNull()
      expect(cut.body.textContent).not.toContain('1 King Street')
    } finally {
      off.addressLines = false
    }
    expect(draw().body.textContent).toContain('1 King Street')
  })
})

describe('location.directionsLink: Get directions', () => {
  const link = (document: Document) =>
    [...document.querySelectorAll('a')].find((a) => a.getAttribute('href')?.startsWith(DESTINATION))

  it('links to Google Maps directions to the address, in a new tab', () => {
    const found = link(draw())
    // The label, then what a screen reader is told about the new tab.
    expect(found?.textContent).toBe('Get directions (opens in a new tab)')
    expect(found?.getAttribute('href')).toBe(
      `${DESTINATION}${encodeURIComponent('1 King Street, Newtown NSW 2042, Australia')}`,
    )
    expect(found?.getAttribute('target')).toBe('_blank')
    expect(found?.getAttribute('rel')).toContain('noopener')
    // Its label is the section's own.
    expect(link(draw(section({ directionsLabel: 'Find us' })))?.textContent).toMatch(/^Find us/)
  })

  it('points at the coordinates when Business info has them', () => {
    const exact = link(draw(section(), { ...business, geo: { lat: -33.89, lng: 151.18 } }))
    expect(exact?.getAttribute('href')).toBe(`${DESTINATION}${encodeURIComponent('-33.89,151.18')}`)
  })

  it('loads nothing from Google until it is followed', () => {
    const html = renderToStaticMarkup(
      <Location data={section({ interactiveMap: true })} business={business} />,
    )
    expect(html).not.toContain('<iframe')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('output=embed')
    expect(html).not.toContain('<link')
  })

  it('draws no directions link without an address', () => {
    expect(link(draw(section(), { ...business, address: null, geo: null }))).toBeUndefined()
  })

  it('draws no directions link once the directions address is disconnected', () => {
    off.directionsUrl = true
    try {
      expect(link(draw())).toBeUndefined()
      expect(draw().body.textContent).not.toContain('Get directions')
    } finally {
      off.directionsUrl = false
    }
    expect(link(draw())).toBeDefined()
  })
})
