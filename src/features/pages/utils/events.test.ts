import { describe, expect, it } from 'vitest'

import { eventsLimit, eventsVariant, upcomingEntries } from './events'

const SYDNEY = 'Australia/Sydney'
const at = (iso: string) => Date.parse(iso)

const oneOff = (title: string, start: string, end?: string) => ({
  title,
  start,
  end: end ?? null,
  allDay: false,
  timeZone: SYDNEY,
  recurrence: null,
})

const weekly = {
  title: 'Pottery club',
  // Tuesdays, 10 am to noon (AEST/AEDT).
  start: '2026-09-29T00:00:00Z',
  end: '2026-09-29T02:00:00Z',
  allDay: false,
  timeZone: SYDNEY,
  recurrence: { repeat: 'weekly', until: null, skip: null },
}

const titles = (entries: { event: { title: string } }[]) => entries.map(({ event }) => event.title)

describe('eventsVariant and eventsLimit', () => {
  it('falls back to the list for anything unknown', () => {
    expect(eventsVariant('agenda')).toBe('agenda')
    expect(eventsVariant('featured')).toBe('featured')
    expect(eventsVariant('list')).toBe('list')
    expect(eventsVariant(undefined)).toBe('list')
    expect(eventsVariant('masonry')).toBe('list')
  })

  it('shows the layout’s own number unless the section sets one', () => {
    expect(eventsLimit('list', null)).toBe(6)
    expect(eventsLimit('agenda', null)).toBe(10)
    expect(eventsLimit('featured', null)).toBe(4)
    expect(eventsLimit('list', 3)).toBe(3)
    expect(eventsLimit('list', 0)).toBe(6)
  })

  it('never shows more than the most a section can ask for', () => {
    expect(eventsLimit('list', 500)).toBe(24)
  })
})

describe('upcomingEntries', () => {
  const now = at('2026-10-16T00:00:00Z')
  const events = [
    oneOff('Last month', '2026-09-10T00:00:00Z', '2026-09-10T02:00:00Z'),
    oneOff('Next month', '2026-11-12T00:00:00Z', '2026-11-12T02:00:00Z'),
    oneOff('Next week', '2026-10-22T00:00:00Z', '2026-10-22T02:00:00Z'),
    oneOff('Under way', '2026-10-15T23:00:00Z', '2026-10-16T03:00:00Z'),
  ]

  it('hides past events and puts the rest in date order', () => {
    const entries = upcomingEntries(events, { now, variant: 'list', limit: 10 })
    expect(titles(entries)).toEqual(['Under way', 'Next week', 'Next month'])
  })

  it('hides an event the moment it ends', () => {
    const after = upcomingEntries(events, {
      now: at('2026-10-16T03:00:01Z'),
      variant: 'list',
      limit: 10,
    })
    expect(titles(after)).toEqual(['Next week', 'Next month'])
  })

  it('stops at the limit', () => {
    expect(titles(upcomingEntries(events, { now, variant: 'list', limit: 2 }))).toEqual([
      'Under way',
      'Next week',
    ])
  })

  it('shows nothing when everything is over', () => {
    expect(
      upcomingEntries(events, { now: at('2027-01-01T00:00:00Z'), variant: 'list', limit: 6 }),
    ).toEqual([])
  })

  it('skips an event without a usable start', () => {
    const [, nextMonth, nextWeek] = events
    const unusable = { ...oneOff('No start', '2026-11-12T00:00:00Z'), start: null }
    expect(
      titles(
        upcomingEntries([unusable, ...(nextMonth && nextWeek ? [nextWeek] : [])], {
          now,
          variant: 'list',
          limit: 6,
        }),
      ),
    ).toEqual(['Next week'])
  })

  it('shows a repeating event once, at its next date, in the list and featured layouts', () => {
    for (const variant of ['list', 'featured']) {
      const entries = upcomingEntries([weekly], { now, variant, limit: 6 })
      expect(entries).toHaveLength(1)
      expect(entries.map(({ occurrence }) => occurrence.date)).toEqual(['2026-10-20'])
    }
  })

  it('shows each date of a repeating event in the agenda, up to eight', () => {
    const entries = upcomingEntries([weekly], { now, variant: 'agenda', limit: 24 })
    expect(entries.map(({ occurrence }) => occurrence.date)).toEqual([
      '2026-10-20',
      '2026-10-27',
      '2026-11-03',
      '2026-11-10',
      '2026-11-17',
      '2026-11-24',
      '2026-12-01',
      '2026-12-08',
    ])
  })

  it('weaves a series in among one-off events by date', () => {
    const entries = upcomingEntries([...events, weekly], { now, variant: 'agenda', limit: 5 })
    expect(entries.map(({ event, occurrence }) => `${occurrence.date} ${event.title}`)).toEqual([
      '2026-10-16 Under way',
      '2026-10-20 Pottery club',
      '2026-10-22 Next week',
      '2026-10-27 Pottery club',
      '2026-11-03 Pottery club',
    ])
  })

  it('uses the business time zone for an event with none of its own', () => {
    const entries = upcomingEntries(
      [{ ...oneOff('No zone', '2026-11-12T00:00:00Z'), timeZone: null }],
      { now, variant: 'list', limit: 6, fallbackTimeZone: 'Australia/Perth' },
    )
    expect(entries.map(({ timing }) => timing.timeZone)).toEqual(['Australia/Perth'])
  })
})
