import { describe, expect, it } from 'vitest'

import {
  countdownInterval,
  formatCountdown,
  formatLaunchLine,
  isLaunchPast,
  launchEnd,
  launchStart,
  zonedInstant,
} from './launch-date'

const SYDNEY = 'Australia/Sydney'
const BRISBANE = 'Australia/Brisbane'
const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString())

describe('zonedInstant', () => {
  it('uses +11:00 in Sydney in summer and +10:00 in winter', () => {
    expect(iso(zonedInstant('2026-11-03', '09:00', SYDNEY))).toBe('2026-11-02T22:00:00.000Z')
    expect(iso(zonedInstant('2026-07-03', '09:00', SYDNEY))).toBe('2026-07-02T23:00:00.000Z')
  })

  it('never changes in Brisbane', () => {
    expect(iso(zonedInstant('2026-11-03', '09:00', BRISBANE))).toBe('2026-11-02T23:00:00.000Z')
    expect(iso(zonedInstant('2026-07-03', '09:00', BRISBANE))).toBe('2026-07-02T23:00:00.000Z')
  })

  it('follows the clocks going forward (Sunday 4 October 2026, 2:00 am becomes 3:00 am)', () => {
    expect(iso(zonedInstant('2026-10-04', '01:30', SYDNEY))).toBe('2026-10-03T15:30:00.000Z')
    expect(iso(zonedInstant('2026-10-04', '03:30', SYDNEY))).toBe('2026-10-03T16:30:00.000Z')
    // The skipped hour lands an hour later rather than failing.
    expect(iso(zonedInstant('2026-10-04', '02:30', SYDNEY))).toBe('2026-10-03T16:30:00.000Z')
  })

  it('follows the clocks going back (Sunday 5 April 2026, 3:00 am becomes 2:00 am)', () => {
    expect(iso(zonedInstant('2026-04-05', '01:30', SYDNEY))).toBe('2026-04-04T14:30:00.000Z')
    expect(iso(zonedInstant('2026-04-05', '04:00', SYDNEY))).toBe('2026-04-04T18:00:00.000Z')
    // 2:30 happens twice; the second, in standard time, is taken.
    expect(iso(zonedInstant('2026-04-05', '02:30', SYDNEY))).toBe('2026-04-04T16:30:00.000Z')
  })

  it('is null for dates and times that are not real', () => {
    expect(zonedInstant('2026-02-30', '09:00', SYDNEY)).toBeNull()
    expect(zonedInstant('3 November', '09:00', SYDNEY)).toBeNull()
    expect(zonedInstant('2026-11-03', '25:00', SYDNEY)).toBeNull()
  })
})

describe('launchStart and launchEnd', () => {
  it('start at the time given, and end then too', () => {
    const launch = { date: '2026-11-03', time: '09:00', timeZone: SYDNEY }
    expect(iso(launchStart(launch))).toBe('2026-11-02T22:00:00.000Z')
    expect(iso(launchEnd(launch))).toBe('2026-11-02T22:00:00.000Z')
  })

  it('cover the whole day without a time', () => {
    const launch = { date: '2026-11-03', timeZone: SYDNEY }
    expect(iso(launchStart(launch))).toBe('2026-11-02T13:00:00.000Z')
    expect(iso(launchEnd(launch))).toBe('2026-11-03T13:00:00.000Z')
  })

  it('make the day 25 hours long when the clocks go back, and 23 when they go forward', () => {
    const back = { date: '2026-04-05', timeZone: SYDNEY }
    expect((launchEnd(back) ?? 0) - (launchStart(back) ?? 0)).toBe(25 * 3_600_000)
    const forward = { date: '2026-10-04', timeZone: SYDNEY }
    expect((launchEnd(forward) ?? 0) - (launchStart(forward) ?? 0)).toBe(23 * 3_600_000)
    const brisbane = { date: '2026-10-04', timeZone: BRISBANE }
    expect((launchEnd(brisbane) ?? 0) - (launchStart(brisbane) ?? 0)).toBe(24 * 3_600_000)
  })

  it('are null without a date', () => {
    expect(launchStart({ timeZone: SYDNEY })).toBeNull()
    expect(launchEnd({ date: null, timeZone: SYDNEY })).toBeNull()
  })
})

describe('isLaunchPast', () => {
  const at = (value: string) => Date.parse(value)

  it('keeps a date with no time all day in the business’s zone, then ends', () => {
    const launch = { date: '2026-11-03', timeZone: SYDNEY }
    // 11:59 pm on the 3rd in Sydney (+11:00) is still the day; midnight is not.
    expect(isLaunchPast(launch, at('2026-11-03T12:59:00Z'))).toBe(false)
    expect(isLaunchPast(launch, at('2026-11-03T13:00:00Z'))).toBe(true)
  })

  it('judges the same date differently in Brisbane, which has no daylight saving', () => {
    const launch = { date: '2026-11-03', timeZone: BRISBANE }
    expect(isLaunchPast(launch, at('2026-11-03T13:00:00Z'))).toBe(false)
    expect(isLaunchPast(launch, at('2026-11-03T14:00:00Z'))).toBe(true)
  })

  it('ends at the time given', () => {
    const launch = { date: '2026-11-03', time: '09:00', timeZone: SYDNEY }
    expect(isLaunchPast(launch, at('2026-11-02T21:59:59Z'))).toBe(false)
    expect(isLaunchPast(launch, at('2026-11-02T22:00:00Z'))).toBe(true)
  })

  it('is before the date a day earlier and after it a day later', () => {
    const launch = { date: '2026-11-03', timeZone: SYDNEY }
    expect(isLaunchPast(launch, at('2026-11-01T00:00:00Z'))).toBe(false)
    expect(isLaunchPast(launch, at('2026-11-05T00:00:00Z'))).toBe(true)
  })

  it('treats an unreadable date as past, so nothing wrong is shown', () => {
    expect(isLaunchPast({ date: 'soon', timeZone: SYDNEY }, 0)).toBe(true)
    expect(isLaunchPast({ timeZone: SYDNEY }, 0)).toBe(true)
  })
})

describe('formatLaunchLine', () => {
  it('reads "Opening Monday 3 November" in en-AU order', () => {
    expect(formatLaunchLine({ date: '2026-11-03' })).toBe('Opening Tuesday 3 November')
    expect(formatLaunchLine({ date: '2026-11-02' })).toBe('Opening Monday 2 November')
  })

  it('uses the label, and adds the time in 12-hour form', () => {
    expect(formatLaunchLine({ date: '2026-12-25', time: '09:30' }, 'Doors open')).toBe(
      'Doors open Friday 25 December, 9:30 am',
    )
    expect(formatLaunchLine({ date: '2026-12-25', time: '17:00' }, '  ')).toBe(
      'Opening Friday 25 December, 5:00 pm',
    )
  })

  it('does not depend on a time zone: the weekday belongs to the calendar date', () => {
    expect(formatLaunchLine({ date: '2026-04-05' })).toBe('Opening Sunday 5 April')
  })

  it('is null without a real date', () => {
    expect(formatLaunchLine({ date: undefined })).toBeNull()
    expect(formatLaunchLine({ date: '2026-13-01' })).toBeNull()
  })
})

describe('the countdown', () => {
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  it('counts days, hours and minutes, then minutes and seconds in the last hour', () => {
    expect(formatCountdown(12 * day + 3 * hour + 5 * minute + 59_000)).toBe(
      '12 days 3 hours 5 minutes',
    )
    expect(formatCountdown(day + hour + minute)).toBe('1 day 1 hour 1 minute')
    expect(formatCountdown(3 * hour)).toBe('3 hours 0 minutes')
    expect(formatCountdown(hour + minute)).toBe('1 hour 1 minute')
    expect(formatCountdown(42 * minute + 10_000)).toBe('42 minutes 10 seconds')
    expect(formatCountdown(59_000)).toBe('59 seconds')
  })

  it('ends at zero', () => {
    expect(formatCountdown(0)).toBeNull()
    expect(formatCountdown(-5)).toBeNull()
  })

  it('redraws once a minute, and once a second only in the last hour', () => {
    expect(countdownInterval(day)).toBe(60_000)
    expect(countdownInterval(hour + 1)).toBe(60_000)
    expect(countdownInterval(hour)).toBe(1000)
    expect(countdownInterval(5000)).toBe(1000)
  })

  it('counts the real time between two instants across a daylight-saving change', () => {
    // 9:00 am on Monday 5 October 2026 in Sydney, from 9:00 am on Saturday: the clocks went forward
    // in between, so it is 47 hours, not 48.
    const target = launchStart({ date: '2026-10-05', time: '09:00', timeZone: SYDNEY }) ?? 0
    const from = launchStart({ date: '2026-10-03', time: '09:00', timeZone: SYDNEY }) ?? 0
    expect(formatCountdown(target - from)).toBe('1 day 23 hours 0 minutes')
    const brisbane = launchStart({ date: '2026-10-05', time: '09:00', timeZone: BRISBANE }) ?? 0
    const brisbaneFrom = launchStart({ date: '2026-10-03', time: '09:00', timeZone: BRISBANE }) ?? 0
    expect(formatCountdown(brisbane - brisbaneFrom)).toBe('2 days 0 hours 0 minutes')
  })
})
