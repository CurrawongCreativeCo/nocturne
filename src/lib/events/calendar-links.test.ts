import { describe, expect, it } from 'vitest'

import { dayStamp, googleCalendarUrl, outlookCalendarUrl, utcStamp } from './calendar-links'

const SYDNEY = 'Australia/Sydney'
const at = (iso: string) => Date.parse(iso)

const entry = {
  title: 'Pottery & glazing, a workshop',
  details: 'Learn to glaze.\nhttps://example.com/events/pottery',
  location: 'The Studio, 12 Rose St, Newtown NSW 2042',
  start: at('2026-03-13T23:00:00Z'),
  end: at('2026-03-14T01:00:00Z'),
  allDay: false,
  timeZone: SYDNEY,
}

describe('stamps', () => {
  it('writes UTC and local-day stamps', () => {
    expect(utcStamp(at('2026-03-13T23:00:00Z'))).toBe('20260313T230000Z')
    expect(dayStamp(at('2026-03-13T23:00:00Z'), SYDNEY)).toBe('20260314')
  })
})

describe('googleCalendarUrl', () => {
  const url = new URL(googleCalendarUrl(entry))

  it('opens Google Calendar’s new event page', () => {
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render')
    expect(url.searchParams.get('action')).toBe('TEMPLATE')
  })

  it('carries the event, escaped by the URL encoder', () => {
    expect(url.searchParams.get('text')).toBe('Pottery & glazing, a workshop')
    expect(url.searchParams.get('details')).toBe(entry.details)
    expect(url.searchParams.get('location')).toBe(entry.location)
  })

  it('gives UTC times and the event’s own zone', () => {
    expect(url.searchParams.get('dates')).toBe('20260313T230000Z/20260314T010000Z')
    expect(url.searchParams.get('ctz')).toBe(SYDNEY)
  })

  it('gives whole days as dates, ending the day after the last', () => {
    const allDay = new URL(
      googleCalendarUrl({
        ...entry,
        allDay: true,
        start: at('2026-03-13T13:00:00Z'),
        end: at('2026-03-15T13:00:00Z'),
      }),
    )
    expect(allDay.searchParams.get('dates')).toBe('20260314/20260316')
    expect(allDay.searchParams.has('ctz')).toBe(false)
  })

  it('gives an event with no end an hour', () => {
    const open = new URL(googleCalendarUrl({ ...entry, end: entry.start }))
    expect(open.searchParams.get('dates')).toBe('20260313T230000Z/20260314T000000Z')
  })

  it('leaves out what is missing', () => {
    const bare = new URL(googleCalendarUrl({ ...entry, details: null, location: null }))
    expect(bare.searchParams.has('details')).toBe(false)
    expect(bare.searchParams.has('location')).toBe(false)
  })
})

describe('outlookCalendarUrl', () => {
  it('opens Outlook’s compose page with the event', () => {
    const url = new URL(outlookCalendarUrl(entry))
    expect(url.origin + url.pathname).toBe('https://outlook.live.com/calendar/0/deeplink/compose')
    expect(url.searchParams.get('rru')).toBe('addevent')
    expect(url.searchParams.get('subject')).toBe(entry.title)
    expect(url.searchParams.get('startdt')).toBe('2026-03-13T23:00:00.000Z')
    expect(url.searchParams.get('enddt')).toBe('2026-03-14T01:00:00.000Z')
    expect(url.searchParams.get('location')).toBe(entry.location)
    expect(url.searchParams.has('allday')).toBe(false)
  })

  it('gives whole days as the first and last day', () => {
    const url = new URL(
      outlookCalendarUrl({
        ...entry,
        allDay: true,
        start: at('2026-03-13T13:00:00Z'),
        end: at('2026-03-15T13:00:00Z'),
      }),
    )
    expect(url.searchParams.get('allday')).toBe('true')
    expect(url.searchParams.get('startdt')).toBe('2026-03-14')
    expect(url.searchParams.get('enddt')).toBe('2026-03-15')
  })
})
