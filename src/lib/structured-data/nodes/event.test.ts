import { describe, expect, it } from 'vitest'

import { resolveTiming } from '@/lib/events/recurrence'

import { buildEvent, type EventInput } from './event'

const build = (event: EventInput) => buildEvent(event).node

function input(extra: Partial<EventInput> = {}, timingInput = {}): EventInput {
  const timing = resolveTiming({
    start: '2026-03-13T23:00:00Z',
    end: '2026-03-14T01:00:00Z',
    timeZone: 'Australia/Sydney',
    ...timingInput,
  })
  if (!timing) throw new Error('timing should resolve')
  return {
    origin: 'https://example.com.au',
    id: 'drafts.4c1e9b7a',
    url: 'https://example.com.au/events/pottery',
    title: 'Pottery & glazing',
    occurrence: { start: timing.start, end: timing.end, date: '2026-03-14' },
    timing,
    status: 'scheduled',
    ...extra,
  }
}

describe('buildEvent', () => {
  it('describes a timed event with its offset', () => {
    expect(
      build(
        input({
          summary: 'Learn to glaze.',
          image: 'https://example.com.au/api/og/events/pottery',
          location: { kind: 'venue', name: 'The Studio', address: '12 Rose St\nNewtown NSW 2042' },
          registrationUrl: 'https://example.com.au/book',
        }),
      ),
    ).toEqual({
      '@type': 'Event',
      '@id': 'https://example.com.au/#event-4c1e9b7a',
      url: 'https://example.com.au/events/pottery',
      name: 'Pottery & glazing',
      description: 'Learn to glaze.',
      image: ['https://example.com.au/api/og/events/pottery'],
      startDate: '2026-03-14T10:00:00+11:00',
      endDate: '2026-03-14T12:00:00+11:00',
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: { '@type': 'Place', name: 'The Studio', address: '12 Rose St, Newtown NSW 2042' },
      offers: {
        '@type': 'Offer',
        url: 'https://example.com.au/book',
        availability: 'https://schema.org/InStock',
      },
      organizer: { '@id': 'https://example.com.au/#organization' },
    })
  })

  it('uses the offset in force on the day (daylight saving)', () => {
    // 9 am AEST in July is 10 am AEDT in March: the zone decides the offset.
    const json = build(input({}, { start: '2026-07-19T23:00:00Z', end: '2026-07-20T01:00:00Z' }))
    expect(json.startDate).toBe('2026-07-20T09:00:00+10:00')
    expect(json.endDate).toBe('2026-07-20T11:00:00+10:00')
  })

  it('marks a cancelled event cancelled and drops the offer', () => {
    const json = build(
      input({ status: 'cancelled', registrationUrl: 'https://example.com.au/book' }),
    )
    expect(json.eventStatus).toBe('https://schema.org/EventCancelled')
    expect(json).not.toHaveProperty('offers')
  })

  it('keeps the offer for a sold-out event, as SoldOut', () => {
    const json = build(input({ status: 'soldOut', registrationUrl: 'https://example.com.au/book' }))
    expect(json.eventStatus).toBe('https://schema.org/EventScheduled')
    expect(json.offers).toMatchObject({ availability: 'https://schema.org/SoldOut' })
  })

  it('describes an online event with a VirtualLocation', () => {
    const json = build(input({ location: { kind: 'online', url: 'https://meet.example.com/abc' } }))
    expect(json.eventAttendanceMode).toBe('https://schema.org/OnlineEventAttendanceMode')
    expect(json.location).toEqual({
      '@type': 'VirtualLocation',
      url: 'https://meet.example.com/abc',
    })
  })

  it('writes an all-day event as dates, the last day included', () => {
    const json = build(
      input({}, { start: '2026-03-13T13:00:00Z', end: '2026-03-15T01:00:00Z', allDay: true }),
    )
    expect(json.startDate).toBe('2026-03-14')
    expect(json.endDate).toBe('2026-03-15')
  })

  it('leaves out what is missing', () => {
    const json = build(input({}, { end: null }))
    for (const key of ['description', 'image', 'endDate', 'location', 'offers']) {
      expect(json).not.toHaveProperty(key)
    }
    // The organiser is always the site's Organization, by reference.
    expect(json.organizer).toEqual({ '@id': 'https://example.com.au/#organization' })
  })

  it('keeps its @id when the slug (and so the url) changes, and never emits a draft id', () => {
    const before = build(input())
    const after = build(
      input({ id: '4c1e9b7a', url: 'https://example.com.au/events/pottery-glazing' }),
    )
    expect(after['@id']).toBe(before['@id'])
    expect(after.url).not.toBe(before.url)
    expect(JSON.stringify(before)).not.toContain('drafts.')
  })

  it('records where each property came from', () => {
    const { provenance } = buildEvent(
      input({ summary: 'Learn to glaze.', location: { kind: 'venue', name: 'The Studio' } }),
    )
    expect(provenance.name).toEqual({ doc: '4c1e9b7a', field: 'title' })
    expect(provenance.description).toEqual({ doc: '4c1e9b7a', field: 'summary' })
    expect(provenance['location.name']).toEqual({ doc: '4c1e9b7a', field: 'location.name' })
    expect(provenance.image).toBeUndefined()
  })
})
