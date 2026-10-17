import { describe, expect, it } from 'vitest'

import {
  expandOccurrences,
  hasUpcoming,
  lastOccurrence,
  monthlyPosition,
  nextOccurrence,
  resolveTiming,
  type EventTimingInput,
} from './recurrence'

const SYDNEY = 'Australia/Sydney'
const iso = (ms: number) => new Date(ms).toISOString()

/** Tuesday 29 Sep 2026, 10:00 am to noon in Sydney (AEST, +10), a week before daylight saving starts. */
const tuesday: EventTimingInput = {
  start: '2026-09-29T00:00:00Z',
  end: '2026-09-29T02:00:00Z',
  timeZone: SYDNEY,
}

function timing(input: EventTimingInput) {
  const resolved = resolveTiming(input)
  if (!resolved) throw new Error('timing should resolve')
  return resolved
}

const starts = (input: EventTimingInput, count: number, from = 0) =>
  expandOccurrences(timing(input), { from, limit: count }).map(({ start }) => iso(start))

describe('resolveTiming', () => {
  it('needs a valid start', () => {
    expect(resolveTiming({})).toBeNull()
    expect(resolveTiming({ start: 'not a date' })).toBeNull()
  })

  it('falls back from the event’s zone to the given one, then to Sydney', () => {
    expect(resolveTiming({ start: '2026-01-01T00:00:00Z' })?.timeZone).toBe(SYDNEY)
    expect(resolveTiming({ start: '2026-01-01T00:00:00Z' }, 'Australia/Perth')?.timeZone).toBe(
      'Australia/Perth',
    )
    expect(
      resolveTiming({ start: '2026-01-01T00:00:00Z', timeZone: 'Nowhere/Land' }, 'Australia/Perth')
        ?.timeZone,
    ).toBe('Australia/Perth')
  })

  it('ignores an end before the start', () => {
    const resolved = timing({ start: '2026-01-01T02:00:00Z', end: '2026-01-01T01:00:00Z' })
    expect(resolved.end).toBe(resolved.start)
  })

  it('runs an all-day event from midnight on its first day to midnight after its last', () => {
    const resolved = timing({
      start: '2026-10-03T03:00:00Z',
      end: '2026-10-05T01:00:00Z',
      allDay: true,
      timeZone: SYDNEY,
    })
    // 3 Oct is AEST (+10); 6 Oct is AEDT (+11).
    expect(iso(resolved.start)).toBe('2026-10-02T14:00:00.000Z')
    expect(iso(resolved.end)).toBe('2026-10-05T13:00:00.000Z')
  })

  it('drops skipped days and an end date that are not dates', () => {
    const resolved = timing({
      ...tuesday,
      recurrence: { repeat: 'weekly', until: 'soon', skip: ['2026-10-06', 'later', null] },
    })
    expect(resolved.until).toBeNull()
    expect([...resolved.skip]).toEqual(['2026-10-06'])
  })
})

describe('one-off events', () => {
  it('has a single occurrence', () => {
    expect(starts(tuesday, 10)).toEqual(['2026-09-29T00:00:00.000Z'])
  })

  it('is hidden once it has ended, and shown while under way', () => {
    const event = timing(tuesday)
    expect(hasUpcoming(event, Date.parse('2026-09-29T01:00:00Z'))).toBe(true)
    expect(hasUpcoming(event, Date.parse('2026-09-29T02:00:01Z'))).toBe(false)
    expect(nextOccurrence(event, Date.parse('2026-09-30T00:00:00Z'))).toBeNull()
  })

  it('counts an event with no end as upcoming up to its start', () => {
    const event = timing({ start: '2026-09-29T00:00:00Z' })
    expect(hasUpcoming(event, Date.parse('2026-09-29T00:00:00Z'))).toBe(true)
    expect(hasUpcoming(event, Date.parse('2026-09-29T00:00:01Z'))).toBe(false)
  })

  it('keeps an all-day event up to the end of its last day, wherever the visitor is', () => {
    const event = timing({ start: '2026-10-03T03:00:00Z', allDay: true, timeZone: SYDNEY })
    expect(hasUpcoming(event, Date.parse('2026-10-03T12:59:59Z'))).toBe(true)
    expect(hasUpcoming(event, Date.parse('2026-10-03T14:00:00Z'))).toBe(false)
  })
})

describe('weekly repeats across daylight saving in Australia/Sydney', () => {
  const weekly: EventTimingInput = { ...tuesday, recurrence: { repeat: 'weekly' } }

  it('stays at 10 am when the clocks go forward on 4 October', () => {
    expect(starts(weekly, 4)).toEqual([
      '2026-09-29T00:00:00.000Z', // 10 am AEST
      '2026-10-05T23:00:00.000Z', // 6 Oct, 10 am AEDT: one hour earlier in UTC
      '2026-10-12T23:00:00.000Z',
      '2026-10-19T23:00:00.000Z',
    ])
  })

  it('stays at 10 am when the clocks go back on 5 April', () => {
    const autumn: EventTimingInput = {
      start: '2026-03-30T23:00:00Z', // Tue 31 Mar, 10 am AEDT
      end: '2026-04-01T01:00:00Z',
      timeZone: SYDNEY,
      recurrence: { repeat: 'weekly' },
    }
    expect(starts(autumn, 3)).toEqual([
      '2026-03-30T23:00:00.000Z',
      '2026-04-07T00:00:00.000Z', // 7 Apr, 10 am AEST: one hour later in UTC
      '2026-04-14T00:00:00.000Z',
    ])
  })

  it('keeps each occurrence the same length', () => {
    const lengths = expandOccurrences(timing(weekly), { from: 0, limit: 2 }).map(
      ({ start, end }) => end - start,
    )
    expect(lengths).toEqual([2 * 3_600_000, 2 * 3_600_000])
  })

  it('reports each occurrence’s local day', () => {
    expect(
      expandOccurrences(timing(weekly), { from: 0, limit: 3 }).map(({ date }) => date),
    ).toEqual(['2026-09-29', '2026-10-06', '2026-10-13'])
  })

  it('does not drift an hour in a zone without daylight saving', () => {
    expect(starts({ ...weekly, timeZone: 'Australia/Brisbane' }, 3)).toEqual([
      '2026-09-29T00:00:00.000Z',
      '2026-10-06T00:00:00.000Z',
      '2026-10-13T00:00:00.000Z',
    ])
  })
})

describe('fortnightly and monthly repeats', () => {
  it('repeats every second week', () => {
    expect(starts({ ...tuesday, recurrence: { repeat: 'fortnightly' } }, 3)).toEqual([
      '2026-09-29T00:00:00.000Z',
      '2026-10-12T23:00:00.000Z',
      '2026-10-26T23:00:00.000Z',
    ])
  })

  it('repeats on the same weekday of the month: the first Tuesday stays the first Tuesday', () => {
    const firstTuesday: EventTimingInput = {
      start: '2026-09-01T00:00:00Z', // Tue 1 Sep, 10 am AEST
      end: '2026-09-01T02:00:00Z',
      timeZone: SYDNEY,
      recurrence: { repeat: 'monthly' },
    }
    expect(starts(firstTuesday, 4)).toEqual([
      '2026-09-01T00:00:00.000Z', // Tue 1 Sep
      '2026-10-05T23:00:00.000Z', // Tue 6 Oct, 10 am AEDT
      '2026-11-02T23:00:00.000Z', // Tue 3 Nov
      '2026-11-30T23:00:00.000Z', // Tue 1 Dec
    ])
  })

  it('treats a fifth weekday as “the last one”, so every month has an occurrence', () => {
    const lastTuesday = {
      ...tuesday, // Tue 29 Sep is the fifth Tuesday of September 2026
      recurrence: { repeat: 'monthly' },
    }
    expect(
      expandOccurrences(timing(lastTuesday), { from: 0, limit: 4 }).map(({ date }) => date),
    ).toEqual(['2026-09-29', '2026-10-27', '2026-11-24', '2026-12-29'])
  })

  it('finds the position in the month', () => {
    expect(monthlyPosition(1)).toBe(1)
    expect(monthlyPosition(14)).toBe(2)
    expect(monthlyPosition(28)).toBe(4)
    expect(monthlyPosition(29)).toBe(-1)
  })

  it('rolls over the new year', () => {
    const december = {
      start: '2026-12-07T23:00:00Z', // Tue 8 Dec, 10 am AEDT, the second Tuesday
      timeZone: SYDNEY,
      recurrence: { repeat: 'monthly' },
    }
    expect(
      expandOccurrences(timing(december), { from: 0, limit: 3 }).map(({ date }) => date),
    ).toEqual(['2026-12-08', '2027-01-12', '2027-02-09'])
  })
})

describe('end date and skipped dates', () => {
  it('stops after the end date, which is included', () => {
    const series = { ...tuesday, recurrence: { repeat: 'weekly', until: '2026-10-13' } }
    expect(expandOccurrences(timing(series), { from: 0 }).map(({ date }) => date)).toEqual([
      '2026-09-29',
      '2026-10-06',
      '2026-10-13',
    ])
  })

  it('leaves out skipped days without counting them against a limit', () => {
    const series = { ...tuesday, recurrence: { repeat: 'weekly', skip: ['2026-10-06'] } }
    expect(
      expandOccurrences(timing(series), { from: 0, limit: 3 }).map(({ date }) => date),
    ).toEqual(['2026-09-29', '2026-10-13', '2026-10-20'])
  })

  it('is over once the last occurrence has ended', () => {
    const series = timing({ ...tuesday, recurrence: { repeat: 'weekly', until: '2026-10-06' } })
    // The last class is 10 am to noon on Tue 6 Oct (AEDT): 23:00 to 01:00 UTC.
    expect(hasUpcoming(series, Date.parse('2026-10-06T00:30:00Z'))).toBe(true)
    expect(hasUpcoming(series, Date.parse('2026-10-06T01:00:01Z'))).toBe(false)
  })

  it('finds the last occurrence of a series with an end date', () => {
    const series = timing({ ...tuesday, recurrence: { repeat: 'weekly', until: '2026-10-13' } })
    expect(lastOccurrence(series)?.date).toBe('2026-10-13')
    expect(lastOccurrence(timing(tuesday))?.date).toBe('2026-09-29')
    expect(lastOccurrence(timing({ ...tuesday, recurrence: { repeat: 'weekly' } }))).toBeNull()
  })
})

describe('windows', () => {
  const weekly = timing({ ...tuesday, recurrence: { repeat: 'weekly' } })

  it('starts at the first occurrence not yet over', () => {
    // 11 am on Tue 6 Oct AEDT: that day's class (10 am to noon) is under way, so it is next.
    const now = Date.parse('2026-10-06T00:00:00Z')
    expect(nextOccurrence(weekly, now)?.date).toBe('2026-10-06')
    expect(nextOccurrence(weekly, Date.parse('2026-10-06T01:00:01Z'))?.date).toBe('2026-10-13')
  })

  it('jumps straight to the window for a series that began years ago', () => {
    const old = timing({
      start: '2016-01-04T23:00:00Z',
      end: '2016-01-05T01:00:00Z',
      timeZone: SYDNEY,
      recurrence: { repeat: 'weekly' },
    })
    const next = nextOccurrence(old, Date.parse('2026-10-16T00:00:00Z'))
    expect(next?.date).toBe('2026-10-20')
  })

  it('stops at the end of the window', () => {
    expect(
      expandOccurrences(weekly, { from: 0, to: Date.parse('2026-10-12T22:59:59Z') }).map(
        ({ date }) => date,
      ),
    ).toEqual(['2026-09-29', '2026-10-06'])
  })

  it('caps an unbounded series at the limit', () => {
    expect(expandOccurrences(weekly, { from: 0, limit: 5 })).toHaveLength(5)
  })
})
