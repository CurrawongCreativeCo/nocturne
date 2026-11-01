import { describe, expect, it } from 'vitest'

import { buildLocation } from '@/lib/structured-data/nodes/location'

import { branchRequires, location, type hiddenForServiceArea } from './location'

interface Field {
  name: string
  hidden?: unknown
  fieldset?: string
}
const fields = location.fields as unknown as Field[]
const hide = (kind: string) => (field: Field) =>
  typeof field.hidden === 'function'
    ? (field.hidden as typeof hiddenForServiceArea)({ document: { kind } } as never)
    : false

describe('place schema: branch and service area', () => {
  it('is registered as `place`, titled Location, because the page-builder section owns `location`', () => {
    expect(location.name).toBe('place')
    expect(location.title).toBe('Location')
  })

  it('requires only the name, kind and page address of the document itself', () => {
    // Anything else required would block a service area, which hides the rest.
    const required = ['name', 'kind', 'slug']
    for (const name of required) expect(fields.some((field) => field.name === name)).toBe(true)
  })

  it('shows a branch every contact, address and hours field', () => {
    const shown = fields.filter((field) => !hide('branch')(field)).map(({ name }) => name)
    for (const name of [
      'phone',
      'publicEmail',
      'address',
      'timeZone',
      'openingHours',
      'specialHours',
      'geo',
    ])
      expect(shown).toContain(name)
  })

  it('hides every one of them from a service area, so none can be required of it', () => {
    const hidden = fields.filter(hide('serviceArea')).map(({ name }) => name)
    expect(hidden.sort()).toEqual(
      ['address', 'geo', 'openingHours', 'phone', 'publicEmail', 'specialHours', 'timeZone'].sort(),
    )
  })

  it('asks a branch for what it needs and a service area for nothing, however it got there', () => {
    expect(branchRequires('branch', true, 'needs it')).toBe('needs it')
    expect(branchRequires('branch', false, 'needs it')).toBe(true)
    // Switched to an area (values kept) or not yet chosen: never blocked.
    expect(branchRequires('serviceArea', true, 'needs it')).toBe(true)
    expect(branchRequires(undefined, true, 'needs it')).toBe(true)
  })
})

describe('switching between branch and service area', () => {
  const doc = {
    origin: 'https://example.com.au',
    id: 'place-1',
    url: 'https://example.com.au/locations/penrith',
    name: 'Penrith',
    businessType: 'Plumber',
    summary: 'Penrith and the mountains.',
    phone: '(02) 9000 0000',
    publicEmail: 'a@example.com.au',
    address: { suburb: 'Penrith', state: 'NSW', postcode: '2750' },
    geo: { lat: -33.75, lng: 150.69 },
    openingHours: [{ days: ['mon'], opens: '07:00', closes: '17:00' }],
    today: '2026-10-31',
  }

  it('emits branch facts for a branch and none of them once it is a service area, keeping the same @id', () => {
    const branch = buildLocation({ ...doc, kind: 'branch' }).node
    const area = buildLocation({ ...doc, kind: 'serviceArea' }).node
    expect(branch).toHaveProperty('telephone')
    expect(branch).toHaveProperty('openingHoursSpecification')
    expect(area['@type']).toBe('Place')
    for (const key of [
      'telephone',
      'email',
      'address',
      'geo',
      'openingHoursSpecification',
      'parentOrganization',
    ])
      expect(area).not.toHaveProperty(key)
    expect(area['@id']).toBe(branch['@id'])
    // And back again: the facts return, since the document never lost them.
    expect(buildLocation({ ...doc, kind: 'branch' }).node).toEqual(branch)
  })
})
