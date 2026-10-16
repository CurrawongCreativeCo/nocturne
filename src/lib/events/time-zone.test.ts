import { describe, expect, it } from 'vitest'

import {
  addDays,
  dateKey,
  daysBetween,
  fromLocal,
  isoWithOffset,
  isValidTimeZone,
  localDateKey,
  offsetAt,
  parseDateKey,
  toLocal,
  transitionsBetween,
  weekdayOf,
} from './time-zone'

const SYDNEY = 'Australia/Sydney'
const HOUR = 3_600_000

describe('toLocal and offsetAt', () => {
  it('reads the wall clock in the zone', () => {
    expect(toLocal(Date.parse('2026-03-14T23:30:00Z'), SYDNEY)).toEqual({
      year: 2026,
      month: 3,
      day: 15,
      hour: 10,
      minute: 30,
      second: 0,
    })
  })

  it('knows daylight saving: +11 h in summer, +10 h in winter, +10 h all year in Brisbane', () => {
    expect(offsetAt(Date.parse('2026-01-15T00:00:00Z'), SYDNEY)).toBe(11 * HOUR)
    expect(offsetAt(Date.parse('2026-07-15T00:00:00Z'), SYDNEY)).toBe(10 * HOUR)
    expect(offsetAt(Date.parse('2026-01-15T00:00:00Z'), 'Australia/Brisbane')).toBe(10 * HOUR)
  })

  it('reads the 12:00 am hour as 0, not 24', () => {
    expect(toLocal(Date.parse('2026-07-14T14:00:00Z'), SYDNEY).hour).toBe(0)
  })
})

describe('fromLocal', () => {
  const at = (year: number, month: number, day: number, hour: number, minute = 0) => ({
    year,
    month,
    day,
    hour,
    minute,
    second: 0,
  })

  it('inverts toLocal', () => {
    const ms = Date.parse('2026-06-01T03:15:00Z')
    expect(fromLocal(toLocal(ms, SYDNEY), SYDNEY)).toBe(ms)
  })

  it('uses the offset in force on that day', () => {
    expect(new Date(fromLocal(at(2026, 1, 20, 10), SYDNEY)).toISOString()).toBe(
      '2026-01-19T23:00:00.000Z',
    )
    expect(new Date(fromLocal(at(2026, 7, 20, 10), SYDNEY)).toISOString()).toBe(
      '2026-07-20T00:00:00.000Z',
    )
  })

  it('moves a time that daylight saving skips to an hour later', () => {
    // 2:00 am on 4 Oct 2026 jumps to 3:00 am, so 2:30 am never happens.
    expect(new Date(fromLocal(at(2026, 10, 4, 2, 30), SYDNEY)).toISOString()).toBe(
      '2026-10-03T16:30:00.000Z',
    )
  })

  it('takes the first of a time that happens twice', () => {
    // 3:00 am on 5 Apr 2026 falls back to 2:00 am, so 2:30 am happens in AEDT, then in AEST.
    expect(new Date(fromLocal(at(2026, 4, 5, 2, 30), SYDNEY)).toISOString()).toBe(
      '2026-04-04T15:30:00.000Z',
    )
  })
})

describe('local dates', () => {
  it('formats and parses date keys', () => {
    expect(dateKey({ year: 2026, month: 3, day: 5 })).toBe('2026-03-05')
    expect(parseDateKey('2026-03-05')).toEqual({ year: 2026, month: 3, day: 5 })
    expect(parseDateKey('2026-02-30')).toBeNull()
    expect(parseDateKey('5/3/2026')).toBeNull()
    expect(parseDateKey(undefined)).toBeNull()
  })

  it('adds calendar days across month ends and leap years', () => {
    expect(addDays({ year: 2026, month: 12, day: 30 }, 3)).toEqual({
      year: 2027,
      month: 1,
      day: 2,
    })
    expect(addDays({ year: 2028, month: 2, day: 28 }, 1).day).toBe(29)
    expect(addDays({ year: 2026, month: 3, day: 1 }, -1)).toEqual({
      year: 2026,
      month: 2,
      day: 28,
    })
  })

  it('counts days and finds weekdays', () => {
    expect(daysBetween({ year: 2026, month: 10, day: 1 }, { year: 2026, month: 10, day: 8 })).toBe(
      7,
    )
    expect(weekdayOf({ year: 2026, month: 3, day: 14 })).toBe(6)
  })

  it('finds the local day an instant falls on', () => {
    expect(localDateKey(Date.parse('2026-03-14T14:30:00Z'), SYDNEY)).toBe('2026-03-15')
  })
})

describe('transitionsBetween', () => {
  const year = [Date.parse('2026-01-01T00:00:00Z'), Date.parse('2027-01-01T00:00:00Z')] as const

  it('finds both of Sydney’s changes in a year, to the second', () => {
    const changes = transitionsBetween(...year, SYDNEY)
    expect(
      changes.map(({ at, from, to, name }) => [
        new Date(at).toISOString(),
        from / HOUR,
        to / HOUR,
        name,
      ]),
    ).toEqual([
      ['2026-04-04T16:00:00.000Z', 11, 10, 'AEST'],
      ['2026-10-03T16:00:00.000Z', 10, 11, 'AEDT'],
    ])
  })

  it('finds none where the clocks never change', () => {
    expect(transitionsBetween(...year, 'Australia/Brisbane')).toEqual([])
  })
})

describe('isValidTimeZone', () => {
  it('accepts IANA names and rejects the rest', () => {
    expect(isValidTimeZone(SYDNEY)).toBe(true)
    expect(isValidTimeZone('Mars/Olympus')).toBe(false)
    expect(isValidTimeZone('')).toBe(false)
  })
})

describe('isoWithOffset', () => {
  it('writes the wall clock with the offset in force', () => {
    expect(isoWithOffset(Date.parse('2026-03-13T23:00:00Z'), SYDNEY)).toBe(
      '2026-03-14T10:00:00+11:00',
    )
    expect(isoWithOffset(Date.parse('2026-07-20T00:00:00Z'), SYDNEY)).toBe(
      '2026-07-20T10:00:00+10:00',
    )
    expect(isoWithOffset(Date.parse('2026-07-20T00:00:00Z'), 'Australia/Adelaide')).toBe(
      '2026-07-20T09:30:00+09:30',
    )
  })
})
