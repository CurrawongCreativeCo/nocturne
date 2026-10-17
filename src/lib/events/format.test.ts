import { describe, expect, it } from 'vitest'

import {
  dayBadge,
  formatClock,
  formatEventSubtitle,
  formatTimeRange,
  formatWhen,
  timeAttribute,
} from './format'

const SYDNEY = 'Australia/Sydney'
const at = (iso: string) => Date.parse(iso)

/** Saturday 14 March 2026, 10 am to noon in Sydney (AEDT, +11). */
const workshop = {
  start: at('2026-03-13T23:00:00Z'),
  end: at('2026-03-14T01:00:00Z'),
  allDay: false,
  timeZone: SYDNEY,
}

describe('formatClock', () => {
  it('writes 12-hour time with a lower-case am or pm', () => {
    expect(formatClock({ hour: 10, minute: 0 })).toBe('10:00 am')
    expect(formatClock({ hour: 0, minute: 5 })).toBe('12:05 am')
    expect(formatClock({ hour: 12, minute: 30 })).toBe('12:30 pm')
    expect(formatClock({ hour: 18, minute: 45 })).toBe('6:45 pm')
  })
})

describe('formatWhen', () => {
  it('shows a start and end on the same day', () => {
    expect(formatWhen(workshop)).toBe('Sat 14 Mar, 10:00 am – 12:00 pm')
  })

  it('writes the day out in full for the event page', () => {
    expect(formatWhen(workshop, true)).toBe('Saturday 14 March 2026, 10:00 am – 12:00 pm')
  })

  it('shows only the start when there is no end', () => {
    expect(formatWhen({ ...workshop, end: workshop.start })).toBe('Sat 14 Mar, 10:00 am')
  })

  it('names the second day when an event runs past midnight', () => {
    expect(formatWhen({ ...workshop, end: at('2026-03-14T13:00:00Z') })).toBe(
      'Sat 14 Mar, 10:00 am – Sun 15 Mar, 12:00 am',
    )
  })

  it('reads the time in the event’s zone, not the server’s', () => {
    expect(formatWhen({ ...workshop, timeZone: 'Australia/Perth' })).toBe(
      'Sat 14 Mar, 7:00 am – 9:00 am',
    )
  })

  it('shows whole days without a time', () => {
    const oneDay = {
      start: at('2026-03-13T13:00:00Z'),
      end: at('2026-03-14T13:00:00Z'),
      allDay: true,
      timeZone: SYDNEY,
    }
    expect(formatWhen(oneDay)).toBe('Sat 14 Mar')
    expect(formatWhen({ ...oneDay, end: at('2026-03-16T13:00:00Z') })).toBe(
      'Sat 14 Mar – Mon 16 Mar',
    )
  })
})

describe('formatTimeRange', () => {
  it('gives the times, or "All day"', () => {
    expect(formatTimeRange(workshop)).toBe('10:00 am – 12:00 pm')
    expect(formatTimeRange({ ...workshop, end: workshop.start })).toBe('10:00 am')
    expect(formatTimeRange({ ...workshop, allDay: true })).toBe('All day')
  })
})

describe('formatEventSubtitle', () => {
  it('is the Studio list subtitle', () => {
    expect(formatEventSubtitle(workshop, 'Workshop')).toBe('Sat 14 Mar, 10:00 am · Workshop')
  })

  it('leaves out an unset category and the time of an all-day event', () => {
    expect(formatEventSubtitle(workshop)).toBe('Sat 14 Mar, 10:00 am')
    expect(formatEventSubtitle({ ...workshop, allDay: true }, 'Festival')).toBe(
      'Sat 14 Mar · Festival',
    )
  })
})

describe('dayBadge and timeAttribute', () => {
  it('splits a date for the badge', () => {
    expect(dayBadge(workshop.start, SYDNEY)).toEqual({
      weekday: 'Sat',
      day: '14',
      month: 'Mar',
      year: 2026,
    })
  })

  it('gives a date for whole days and an instant otherwise', () => {
    expect(timeAttribute(workshop.start, false, SYDNEY)).toBe('2026-03-13T23:00:00.000Z')
    expect(timeAttribute(workshop.start, true, SYDNEY)).toBe('2026-03-14')
  })
})
