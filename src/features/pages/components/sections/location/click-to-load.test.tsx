// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { embedUrl } from '@/lib/location-links'
import type * as LocationLinks from '@/lib/location-links'
import type { LocationBusiness } from '@/types/business'

import { Location } from '.'
import type { SectionOf } from '../../../types'

/**
 * The content source `location.clickToLoadEmbed` (task 275; src/lib/design/capability-evidence.ts): the
 * optional interactive map, a privacy-first Google map that loads only after a visitor clicks. These
 * are the source's own tests: nothing from Google is in the server markup or the page before the click,
 * the button says the map comes from Google, the click swaps in the frame and moves focus to it, and
 * cutting the embed address (`embedUrl`) removes the facade. The address card and Directions link are in
 * sources.test.tsx.
 */

vi.mock('next-sanity/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  Image: () => <img alt="Map" data-picture="" />,
}))
vi.mock('@/config/env', () => ({
  projectId: 'e2etest1',
  dataset: 'production',
  apiVersion: '2026-10-01',
  siteLanguage: 'en',
  studioUrl: '/studio',
}))

const off = vi.hoisted(() => ({ embedUrl: false }))
vi.mock('@/lib/location-links', async (load) => {
  const actual = await load<typeof LocationLinks>()
  return {
    ...actual,
    embedUrl: (place: Parameters<typeof actual.embedUrl>[0]) =>
      off.embedUrl ? null : actual.embedUrl(place),
  }
})

afterEach(cleanup)

const business: LocationBusiness = {
  tradingName: 'Test Co',
  phone: '(02) 9876 5432',
  phoneHref: '+61298765432',
  publicEmail: 'hello@example.com',
  address: { street: '1 King Street', suburb: 'Newtown', state: 'NSW', postcode: '2042' },
  geo: null,
  timeZone: 'Australia/Sydney',
  openingHours: [],
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
    interactiveMap: true,
    ...extra,
  }) as unknown as SectionOf<'location'>

const MAP_IMAGE = {
  alt: 'A map',
  asset: {
    _id: 'image-abc-1200x800-jpg',
    metadata: { lqip: null, hasAlpha: false, dimensions: { width: 1200, height: 800 } },
  },
}

const BUTTON = 'Load interactive map'
const EMBED = 'https://www.google.com/maps?q='

describe('location.clickToLoadEmbed: the interactive map', () => {
  it('draws no map or button when the interactive map is off', () => {
    const { container } = render(
      <Location data={section({ interactiveMap: false })} business={business} />,
    )
    expect(screen.queryByRole('button', { name: BUTTON })).toBeNull()
    expect(container.querySelector('iframe')).toBeNull()
    expect(container.innerHTML).not.toContain('google.com/maps?')
  })

  it('draws no button, frame or Google address in the server markup', () => {
    // Without JavaScript the button would do nothing, so the server draws none; and no frame, script
    // or embed address, so nothing can be requested from Google before a click.
    const html = renderToStaticMarkup(<Location data={section()} business={business} />)
    expect(html).not.toContain(BUTTON)
    expect(html).not.toContain('<iframe')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('output=embed')
    expect(html).not.toContain(EMBED)
  })

  it('offers a Load interactive map button, with a note that the map comes from Google', () => {
    const { container } = render(<Location data={section()} business={business} />)
    expect(screen.getByRole('button', { name: BUTTON })).toBeTruthy()
    expect(
      screen.getByText('This map comes from Google. Loading it shares your visit with Google.'),
    ).toBeTruthy()
    // Still nothing from Google: the button is all there is.
    expect(container.querySelector('iframe')).toBeNull()
    expect(container.innerHTML).not.toContain('output=embed')
  })

  it('loads the map only after a click, and moves focus to it', () => {
    const { container } = render(<Location data={section()} business={business} />)
    fireEvent.click(screen.getByRole('button', { name: BUTTON }))
    const frame = container.querySelector('iframe')
    expect(frame).not.toBeNull()
    expect(frame?.getAttribute('src')).toBe(embedUrl(business))
    expect(frame?.getAttribute('src')).toBe(
      `${EMBED}${encodeURIComponent('1 King Street, Newtown NSW 2042, Australia')}&z=15&output=embed`,
    )
    expect(frame?.getAttribute('title')).toBe('Map of 1 King Street, Newtown NSW 2042')
    expect(frame?.getAttribute('loading')).toBe('lazy')
    // The button the visitor pressed is gone, so focus moves to what replaced it.
    expect(screen.queryByRole('button', { name: BUTTON })).toBeNull()
    expect(document.activeElement).toBe(frame)
  })

  it('draws no facade once the embed address is disconnected', () => {
    off.embedUrl = true
    try {
      const { container } = render(<Location data={section()} business={business} />)
      expect(screen.queryByRole('button', { name: BUTTON })).toBeNull()
      expect(container.querySelector('iframe')).toBeNull()
    } finally {
      off.embedUrl = false
    }
    cleanup()
    render(<Location data={section()} business={business} />)
    expect(screen.getByRole('button', { name: BUTTON })).toBeTruthy()
  })

  it('keeps the picture above the button when there is a map image', () => {
    const { container } = render(
      <Location data={section({ mapImage: MAP_IMAGE })} business={business} />,
    )
    const picture = container.querySelector('[data-picture]')
    const button = screen.getByRole('button', { name: BUTTON })
    expect(picture).not.toBeNull()
    // The picture comes first; the click then replaces the pair with the frame.
    expect(
      (picture?.compareDocumentPosition(button) ?? 0) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    fireEvent.click(button)
    expect(container.querySelector('[data-picture]')).toBeNull()
    expect(container.querySelector('iframe')).not.toBeNull()
  })
})
