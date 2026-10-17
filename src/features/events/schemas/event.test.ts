import { describe, expect, it } from 'vitest'

import { checkEnd, checkSlug, checkTimeZone, checkUntil, event, eventPreview } from './event'

describe('eventPreview', () => {
  it('shows the date, time and category in the Studio list', () => {
    expect(
      eventPreview({
        title: 'Pottery',
        start: '2026-03-13T23:00:00Z',
        timeZone: 'Australia/Sydney',
        category: 'Workshop',
      }),
    ).toEqual({ title: 'Pottery', subtitle: 'Sat 14 Mar, 10:00 am · Workshop' })
  })

  it('leaves out the time of an all-day event and the category when unset', () => {
    expect(
      eventPreview({
        title: 'Open day',
        start: '2026-03-13T23:00:00Z',
        allDay: true,
        timeZone: 'Australia/Sydney',
      }).subtitle,
    ).toBe('Sat 14 Mar')
  })

  it('says when an event is cancelled or sold out, and nothing when it is scheduled', () => {
    const base = { title: 'Pottery', start: '2026-03-13T23:00:00Z', timeZone: 'Australia/Sydney' }
    expect(eventPreview({ ...base, status: 'cancelled' }).subtitle).toBe(
      'Sat 14 Mar, 10:00 am · Cancelled',
    )
    expect(eventPreview({ ...base, status: 'soldOut', category: 'Workshop' }).subtitle).toBe(
      'Sat 14 Mar, 10:00 am · Workshop · Sold out',
    )
    expect(eventPreview({ ...base, status: 'scheduled' }).subtitle).toBe('Sat 14 Mar, 10:00 am')
  })

  it('copes with an event that has no date or title yet', () => {
    expect(eventPreview({})).toEqual({ title: 'Untitled event', subtitle: 'No date yet' })
  })
})

describe('event schema', () => {
  const names = event.fields.map((field) => field.name)

  it('has the fields the brief asks for', () => {
    for (const name of [
      'title',
      'slug',
      'start',
      'end',
      'allDay',
      'timeZone',
      'summary',
      'body',
      'image',
      'location',
      'category',
      'registration',
      'status',
      'capacityNote',
      'recurrence',
    ]) {
      expect(names, name).toContain(name)
    }
  })

  it('lists events soonest first', () => {
    expect(event.orderings[0]).toMatchObject({ by: [{ field: 'start', direction: 'asc' }] })
  })
})

describe('validation', () => {
  const sydney = { start: '2026-03-13T23:00:00Z', timeZone: 'Australia/Sydney' }

  it('needs the end to come after the start', () => {
    expect(checkEnd('2026-03-14T01:00:00Z', sydney)).toBe(true)
    expect(checkEnd('2026-03-13T23:00:00Z', sydney)).toBe('The end must be after the start')
    expect(checkEnd('2026-03-13T22:00:00Z', sydney)).toBe('The end must be after the start')
  })

  it('accepts no end, or no start yet', () => {
    expect(checkEnd(undefined, sydney)).toBe(true)
    expect(checkEnd('2026-03-14T01:00:00Z', {})).toBe(true)
  })

  it('lets an all-day event end on the day it starts, but not before it', () => {
    const allDay = { ...sydney, allDay: true }
    // 14 March in Sydney, whatever the times picked.
    expect(checkEnd('2026-03-14T10:00:00Z', allDay)).toBe(true)
    expect(checkEnd('2026-03-13T10:00:00Z', allDay)).toBe(
      'The last day must not be before the first day',
    )
  })

  it('needs a time zone for a timed event only', () => {
    expect(checkTimeZone(undefined, { allDay: false })).toBe(
      'Choose the time zone: a timed event needs one',
    )
    expect(checkTimeZone(undefined, {})).toBe('Choose the time zone: a timed event needs one')
    expect(checkTimeZone(undefined, { allDay: true })).toBe(true)
    expect(checkTimeZone('Australia/Perth', { allDay: false })).toBe(true)
  })

  it('needs the last date of a series to be on or after its first', () => {
    // The first date is 14 March in Sydney.
    expect(checkUntil('2026-03-14', sydney)).toBe(true)
    expect(checkUntil('2026-12-31', sydney)).toBe(true)
    expect(checkUntil('2026-03-13', sydney)).toBe(
      'This is before the first date, so it would never happen',
    )
    expect(checkUntil(undefined, sydney)).toBe(true)
  })

  it('checks the page address', () => {
    expect(checkSlug('open-day')).toBe(true)
    expect(checkSlug(undefined)).toBe(true)
    expect(checkSlug('Open Day')).toMatch(/Lowercase letters/)
    expect(checkSlug('feed')).toMatch(/calendar feed/)
  })
})
