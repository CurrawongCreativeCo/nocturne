import { describe, expect, it } from 'vitest'

import { toIcsEvent, type CalendarSource } from './to-ics'

const source: CalendarSource = {
  _id: 'drafts.event-1',
  _updatedAt: '2026-03-01T00:00:00Z',
  slug: 'pottery',
  title: 'Pottery',
  summary: 'Learn to glaze.',
  start: '2026-03-13T23:00:00Z',
  end: '2026-03-14T01:00:00Z',
  timeZone: 'Australia/Sydney',
  location: { kind: 'venue', name: 'The Studio', address: '12 Rose St' },
  category: 'Workshop',
}

describe('toIcsEvent', () => {
  const event = toIcsEvent(source, 'https://example.com.au')

  it('gives the event a stable identity, whether or not it is a draft', () => {
    expect(event?.uid).toBe('event-1@example.com.au')
  })

  it('carries the page address, place, summary and category', () => {
    expect(event).toMatchObject({
      title: 'Pottery',
      url: 'https://example.com.au/events/pottery',
      location: 'The Studio, 12 Rose St',
      description: 'Learn to glaze.',
      category: 'Workshop',
      status: 'scheduled',
      modified: Date.parse('2026-03-01T00:00:00Z'),
    })
  })

  it('adds the joining link of an online event to the description', () => {
    const online = toIcsEvent(
      { ...source, location: { kind: 'online', url: 'https://meet.example.com/abc' } },
      'https://example.com.au',
    )
    expect(online?.description).toBe('Learn to glaze.\n\nJoin online: https://meet.example.com/abc')
    expect(online?.location).toBe('https://meet.example.com/abc')
  })

  it('reads the status, and treats anything unknown as scheduled', () => {
    expect(toIcsEvent({ ...source, status: 'cancelled' }, 'https://example.com.au')?.status).toBe(
      'cancelled',
    )
    expect(toIcsEvent({ ...source, status: 'soldOut' }, 'https://example.com.au')?.status).toBe(
      'soldOut',
    )
    expect(toIcsEvent({ ...source, status: 'postponed' }, 'https://example.com.au')?.status).toBe(
      'scheduled',
    )
  })

  it('has nothing for an event without a start', () => {
    expect(toIcsEvent({ ...source, start: null }, 'https://example.com.au')).toBeNull()
  })

  it('uses the fallback time zone when the event has none', () => {
    const noZone = toIcsEvent(
      { ...source, timeZone: null },
      'https://example.com.au',
      'Australia/Perth',
    )
    expect(noZone?.timing.timeZone).toBe('Australia/Perth')
  })
})
