import { describe, expect, it } from 'vitest'

import { daysBetween, formatRelativeTime, isStaleDraft } from './relative-time'

const NOW = Date.parse('2026-10-15T02:00:00Z')
const ago = (ms: number) => new Date(NOW - ms).toISOString()
const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

describe('formatRelativeTime', () => {
  it.each([
    [0, 'just now'],
    [30_000, 'just now'],
    [5 * MIN, '5 minutes ago'],
    [MIN, '1 minute ago'],
    [3 * HOUR, '3 hours ago'],
    [DAY, 'yesterday'],
    [2 * DAY, '2 days ago'],
    [6 * DAY, '6 days ago'],
    [14 * DAY, '2 weeks ago'],
  ])('%i ms ago reads "%s"', (elapsed, expected) => {
    expect(formatRelativeTime(ago(elapsed), NOW)).toBe(expected)
  })

  it('switches to an Australian date after about two months', () => {
    expect(formatRelativeTime('2026-05-04T00:00:00Z', NOW)).toMatch(/^4 May 2026$/)
    expect(formatRelativeTime('2026-01-31T00:00:00Z', NOW)).toMatch(/^31 Jan 2026$/)
  })

  it('treats a future time as just now and a bad date as empty', () => {
    expect(formatRelativeTime(new Date(NOW + HOUR), NOW)).toBe('just now')
    expect(formatRelativeTime('not a date', NOW)).toBe('')
  })
})

describe('daysBetween and isStaleDraft', () => {
  it('counts whole days', () => {
    expect(daysBetween(ago(2.9 * DAY), NOW)).toBe(2)
  })

  it('treats a draft as stale only after more than seven days', () => {
    expect(isStaleDraft(ago(7 * DAY), NOW)).toBe(false)
    expect(isStaleDraft(ago(7 * DAY + MIN), NOW)).toBe(true)
    expect(isStaleDraft(ago(DAY), NOW)).toBe(false)
  })
})
