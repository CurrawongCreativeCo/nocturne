import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { LocationBusiness } from '@/types/business'

import { Location } from '.'
import type { SectionOf } from '../../../types'

// A picture is not what these tests are about, and next-sanity's needs Next's runtime.
vi.mock('next-sanity/image', () => ({ Image: () => null }))

// The sections import the Sanity project's settings, which a unit test has no .env for.
vi.mock('@/config/env', () => ({
  projectId: 'e2etest1',
  dataset: 'production',
  apiVersion: '2026-10-01',
  siteLanguage: 'en',
  studioUrl: '/studio',
}))

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

const render = (data = section(), biz: LocationBusiness | null = business) =>
  renderToStaticMarkup(<Location data={data} business={biz} />)

describe('Location', () => {
  it('shows the address, contact links and hours', () => {
    const html = render()
    expect(html).toContain('1 King Street')
    expect(html).toContain('Newtown NSW 2042')
    expect(html).toContain('href="tel:+61298765432"')
    expect(html).toContain('href="mailto:hello@example.com"')
    expect(html).toContain('Mon–Tue')
    expect(html).toContain('8:00 am – 5:30 pm')
  })

  it('links to directions with the encoded address and never embeds Google', () => {
    const html = render()
    expect(html).toContain(
      'https://www.google.com/maps/dir/?api=1&amp;destination=1%20King%20Street%2C%20Newtown%20NSW%202042%2C%20Australia',
    )
    expect(html).not.toContain('<iframe')
    // Even with the interactive map on, the server markup holds no frame and no Google embed address.
    const offered = render(section({ interactiveMap: true }))
    expect(offered).not.toContain('<iframe')
    expect(offered).not.toContain('output=embed')
  })

  it('leaves out the hours and contact blocks when switched off', () => {
    const html = render(section({ showHours: false, showContact: false }))
    expect(html).not.toContain('Opening hours')
    expect(html).not.toContain('tel:')
    expect(html).toContain('1 King Street')
  })

  it('shows a phone that is not dialable as text', () => {
    const html = render(section(), { ...business, phone: 'ask for Sam', phoneHref: null })
    expect(html).toContain('ask for Sam')
    expect(html).not.toContain('tel:')
  })

  it('renders nothing without Business info, or when it has nothing to show', () => {
    expect(render(section(), null)).toBe('')
    const empty: LocationBusiness = {
      ...business,
      phone: null,
      phoneHref: null,
      publicEmail: null,
      address: null,
      openingHours: null,
    }
    expect(render(section(), empty)).toBe('')
  })
})
