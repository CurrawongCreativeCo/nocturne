import { describe, expect, it } from 'vitest'

import { EVENT_SLUG_PATTERN, slugifyEvent } from './slug'

describe('slugifyEvent', () => {
  it('makes a single, lower-case path segment', () => {
    expect(slugifyEvent('Open Day & BBQ!')).toBe('open-day-bbq')
    expect(slugifyEvent('  Café — Night 2026 ')).toBe('cafe-night-2026')
  })

  it('never keeps a slash or a dot, so /events/<slug>.ics stays unambiguous', () => {
    expect(slugifyEvent('a/b')).toBe('a-b')
    expect(slugifyEvent('feed.ics')).toBe('feed-ics')
  })
})

describe('EVENT_SLUG_PATTERN', () => {
  it('accepts hyphenated words and rejects the rest', () => {
    expect(EVENT_SLUG_PATTERN.test('open-day-2026')).toBe(true)
    for (const bad of ['Open-Day', 'open day', 'open/day', 'open.ics', '-open', 'open-', 'a--b']) {
      expect(EVENT_SLUG_PATTERN.test(bad)).toBe(false)
    }
  })
})
