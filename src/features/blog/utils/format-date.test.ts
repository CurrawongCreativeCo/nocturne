import { describe, expect, it } from 'vitest'

import { formatDate } from './format-date'

describe('formatDate', () => {
  it('writes the long date in the given language', () => {
    expect(formatDate('2026-10-01T09:30:00Z', 'en-AU')).toBe('1 October 2026')
    expect(formatDate('2026-10-01T09:30:00Z', 'en-US')).toBe('October 1, 2026')
  })

  it('uses the UTC day whatever the machine time zone', () => {
    expect(formatDate('2026-10-01T23:59:00Z', 'en-AU')).toBe('1 October 2026')
    expect(formatDate('2026-10-02T00:00:00Z', 'en-AU')).toBe('2 October 2026')
  })
})
