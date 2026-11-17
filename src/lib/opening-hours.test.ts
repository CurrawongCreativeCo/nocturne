import { describe, expect, it } from 'vitest'

import {
  formatDate,
  formatTime,
  groupOpeningHours,
  localMoment,
  openStatusAt,
  resolveTimeZone,
  upcomingSpecialHours,
  weeklyRanges,
  type HoursEntry,
} from './opening-hours'

const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri']

describe('formatTime', () => {
  it('writes 12-hour times in the Australian style', () => {
    expect(formatTime('08:00')).toBe('8:00 am')
    expect(formatTime('17:30')).toBe('5:30 pm')
    expect(formatTime('12:00')).toBe('12:00 pm')
    expect(formatTime('00:15')).toBe('12:15 am')
  })
})

describe('groupOpeningHours', () => {
  it('groups identical days and shows closed days', () => {
    const groups = groupOpeningHours([
      { days: weekdays, opens: '08:00', closes: '17:30' },
      { days: ['sat'], opens: '09:00', closes: '13:00' },
      { days: ['sun'], closed: true },
    ])
    expect(groups.map(({ label, times }) => `${label} ${times}`)).toEqual([
      'Mon–Fri 8:00 am – 5:30 pm',
      'Sat 9:00 am – 1:00 pm',
      'Sun Closed',
    ])
  })

  it('treats days with no row as closed and joins them', () => {
    const groups = groupOpeningHours([{ days: weekdays, opens: '09:00', closes: '17:00' }])
    expect(groups[1]).toMatchObject({ label: 'Sat, Sun', closed: true, times: 'Closed' })
  })

  it('merges days that are not next to each other', () => {
    const groups = groupOpeningHours([
      { days: ['mon', 'wed', 'thu', 'fri'], opens: '10:00', closes: '16:00' },
    ])
    expect(groups[0]?.label).toBe('Mon, Wed–Fri')
    expect(groups[1]?.label).toBe('Tue, Sat, Sun')
  })

  it('lists split shifts in order', () => {
    const groups = groupOpeningHours([
      { days: ['mon'], opens: '13:00', closes: '17:00' },
      { days: ['mon'], opens: '08:00', closes: '12:00' },
    ])
    expect(groups[0]?.times).toBe('8:00 am – 12:00 pm, 1:00 pm – 5:00 pm')
  })

  it('lets a closed row win and ignores incomplete or backwards rows', () => {
    const entries: HoursEntry[] = [
      { days: ['mon', 'tue'], opens: '09:00', closes: '17:00' },
      { days: ['tue'], closed: true },
      { days: ['wed'], opens: '17:00', closes: '09:00' },
      { days: ['thu'], opens: '09:00' },
    ]
    expect(groupOpeningHours(entries).map(({ label, times }) => `${label}: ${times}`)).toEqual([
      'Mon: 9:00 am – 5:00 pm',
      'Tue–Sun: Closed',
    ])
  })

  it('returns nothing when no day has hours', () => {
    expect(groupOpeningHours([])).toEqual([])
    expect(groupOpeningHours(null)).toEqual([])
    expect(groupOpeningHours([{ days: ['mon'], closed: true }])).toEqual([])
  })
})

describe('weeklyRanges', () => {
  it('shares one range between the days that have it and leaves out closed days', () => {
    expect(
      weeklyRanges([
        { days: weekdays, opens: '08:00', closes: '17:30' },
        { days: ['fri'], closed: true },
        { days: ['sat'], opens: '09:00', closes: '13:00' },
      ]),
    ).toEqual([
      { opens: '08:00', closes: '17:30', days: ['mon', 'tue', 'wed', 'thu'] },
      { opens: '09:00', closes: '13:00', days: ['sat'] },
    ])
  })
})

describe('formatDate', () => {
  it('names the weekday', () => {
    expect(formatDate('2026-12-25')).toBe('Fri 25 Dec')
    expect(formatDate('2027-01-26')).toBe('Tue 26 Jan')
    expect(formatDate('2026-10-18')).toBe('Sun 18 Oct')
  })
})

describe('upcomingSpecialHours', () => {
  const special = [
    { date: '2026-12-25', closed: true, note: 'Christmas Day' },
    { date: '2026-01-26', closed: true, note: 'Australia Day' },
    { date: '2026-12-24', opens: '09:00', closes: '13:00' },
    { date: '2026-12-31', opens: '09:00' },
  ]

  it('drops past and half-filled days and sorts the rest', () => {
    expect(upcomingSpecialHours(special, '2026-10-15')).toEqual([
      {
        date: '2026-12-24',
        label: 'Thu 24 Dec',
        closed: false,
        times: '9:00 am – 1:00 pm',
        opens: '09:00',
        closes: '13:00',
      },
      {
        date: '2026-12-25',
        label: 'Fri 25 Dec',
        closed: true,
        times: 'Closed',
        note: 'Christmas Day',
      },
    ])
  })

  it('keeps today and respects the limit', () => {
    expect(upcomingSpecialHours(special, '2026-12-25', 1)).toHaveLength(1)
  })
})

describe('localMoment', () => {
  it('reads the wall clock in the given time zone', () => {
    // 2026-10-15 23:30 UTC is already Friday 16 October on the east coast (AEDT, UTC+11)...
    const instant = new Date('2026-10-15T23:30:00Z')
    expect(localMoment(instant, 'Australia/Sydney')).toEqual({
      day: 'fri',
      date: '2026-10-16',
      time: '10:30',
    })
    // ...but Brisbane has no daylight saving (UTC+10) and Perth is UTC+8.
    expect(localMoment(instant, 'Australia/Brisbane').time).toBe('09:30')
    expect(localMoment(instant, 'Australia/Perth')).toMatchObject({ day: 'fri', time: '07:30' })
  })

  it('writes midnight as 00:00', () => {
    expect(localMoment(new Date('2026-06-30T14:00:00Z'), 'Australia/Sydney').time).toBe('00:00')
  })
})

describe('openStatusAt', () => {
  const hours: HoursEntry[] = [
    { days: weekdays, opens: '08:00', closes: '17:30' },
    { days: ['sat'], opens: '09:00', closes: '13:00' },
  ]
  // Friday 16 October 2026 (AEDT, UTC+11).
  const at = (time: string) => new Date(`2026-10-16T${time}:00+11:00`)

  it('is open inside the hours and says when it closes', () => {
    expect(openStatusAt(hours, [], 'Australia/Sydney', at('10:00'))).toEqual({
      open: true,
      until: '5:30 pm',
    })
  })

  it('is closed before opening, at closing time and on a closed day', () => {
    expect(openStatusAt(hours, [], 'Australia/Sydney', at('07:59'))).toEqual({ open: false })
    expect(openStatusAt(hours, [], 'Australia/Sydney', at('17:30'))).toEqual({ open: false })
    const sunday = new Date('2026-10-18T10:00:00+11:00')
    expect(openStatusAt(hours, [], 'Australia/Sydney', sunday)).toEqual({ open: false })
  })

  it("uses the business's own time zone, not the viewer's", () => {
    // 10:00 in Sydney is 07:00 in Perth, before Perth opens.
    expect(openStatusAt(hours, [], 'Australia/Perth', at('10:00'))).toEqual({ open: false })
  })

  it('lets a special day replace the regular hours', () => {
    const closed = [{ date: '2026-10-16', closed: true }]
    expect(openStatusAt(hours, closed, 'Australia/Sydney', at('10:00'))).toEqual({ open: false })
    const short = [{ date: '2026-10-16', opens: '10:00', closes: '12:00' }]
    expect(openStatusAt(hours, short, 'Australia/Sydney', at('11:00'))).toEqual({
      open: true,
      until: '12:00 pm',
    })
    expect(openStatusAt(hours, short, 'Australia/Sydney', at('15:00'))).toEqual({ open: false })
  })

  it('does not guess without hours', () => {
    expect(openStatusAt([], [], 'Australia/Sydney', at('10:00'))).toBeNull()
  })
})

describe('time zones, daylight saving and overnight hours', () => {
  const sunday: HoursEntry[] = [{ days: ['sun'], opens: '02:30', closes: '10:00' }]

  it('reads the wall clock across the start of daylight saving (Sydney, 4 October 2026)', () => {
    // 02:00 AEST becomes 03:00 AEDT: 01:59 is the last minute before the jump.
    expect(localMoment(new Date('2026-10-03T15:59:00Z'), 'Australia/Sydney')).toMatchObject({
      date: '2026-10-04',
      time: '01:59',
    })
    expect(localMoment(new Date('2026-10-03T16:00:00Z'), 'Australia/Sydney')).toMatchObject({
      date: '2026-10-04',
      time: '03:00',
    })
    // Hours that begin inside the skipped hour start being open as soon as the clock passes them.
    expect(openStatusAt(sunday, [], 'Australia/Sydney', new Date('2026-10-03T15:59:00Z'))).toEqual({
      open: false,
    })
    expect(openStatusAt(sunday, [], 'Australia/Sydney', new Date('2026-10-03T16:00:00Z'))).toEqual({
      open: true,
      until: '10:00 am',
    })
  })

  it('reads the wall clock across the end of daylight saving (Sydney, 5 April 2026)', () => {
    // 03:00 AEDT becomes 02:00 AEST, so 02:30 happens twice; both are Sunday 5 April.
    for (const instant of ['2026-04-04T15:30:00Z', '2026-04-04T16:30:00Z'])
      expect(localMoment(new Date(instant), 'Australia/Sydney')).toMatchObject({
        date: '2026-04-05',
        time: '02:30',
      })
  })

  it('keeps one instant in different places on different days and times', () => {
    const instant = new Date('2026-10-03T16:00:00Z')
    expect(localMoment(instant, 'Australia/Sydney')).toMatchObject({ day: 'sun', time: '03:00' })
    // Perth has no daylight saving: UTC+8, just past midnight on the same Sunday.
    expect(localMoment(instant, 'Australia/Perth')).toMatchObject({ day: 'sun', time: '00:00' })
    expect(localMoment(instant, 'Australia/Brisbane')).toMatchObject({ day: 'sun', time: '02:00' })
  })

  it('does not support overnight ranges: a closing time before the opening time is ignored, never guessed', () => {
    const night: HoursEntry[] = [{ days: ['fri'], opens: '22:00', closes: '02:00' }]
    // Friday 23:00 Sydney: not "open", because the row is not a valid range (use two rows instead).
    expect(
      openStatusAt(night, [], 'Australia/Sydney', new Date('2026-10-16T23:00:00+11:00')),
    ).toBeNull()
    const split: HoursEntry[] = [
      { days: ['fri'], opens: '22:00', closes: '23:59' },
      { days: ['sat'], opens: '00:00', closes: '02:00' },
    ]
    expect(
      openStatusAt(split, [], 'Australia/Sydney', new Date('2026-10-16T23:00:00+11:00')),
    ).toEqual({
      open: true,
      until: '11:59 pm',
    })
    expect(
      openStatusAt(split, [], 'Australia/Sydney', new Date('2026-10-17T01:00:00+11:00')),
    ).toEqual({
      open: true,
      until: '2:00 am',
    })
  })

  it('applies a special day on the location’s own date, not the server’s', () => {
    // 16:00 UTC on 3 October is already 4 October in Sydney.
    const closed = [{ date: '2026-10-04', closed: true }]
    expect(
      openStatusAt(sunday, closed, 'Australia/Sydney', new Date('2026-10-03T16:00:00Z')),
    ).toEqual({ open: false })
    expect(
      openStatusAt(sunday, closed, 'Australia/Perth', new Date('2026-10-03T14:00:00Z')),
    ).toEqual({ open: false })
  })
})

describe('resolveTimeZone', () => {
  it('keeps a real zone and falls back for a missing or unknown one, without throwing', () => {
    expect(resolveTimeZone('Australia/Perth')).toBe('Australia/Perth')
    for (const value of [undefined, null, '', 'Mars/Olympus', 'not a zone'])
      expect(resolveTimeZone(value)).toBe('Australia/Sydney')
  })
})
