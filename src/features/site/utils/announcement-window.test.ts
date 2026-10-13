import { describe, expect, it } from 'vitest'

import { isInWindow } from './announcement-window'

const START = '2026-03-01T00:00:00Z'
const END = '2026-03-31T00:00:00Z'
const at = (iso: string) => Date.parse(iso)

describe('isInWindow', () => {
  it('is always open without dates', () => {
    expect(isInWindow(at('2026-01-01T00:00:00Z'), null, null)).toBe(true)
    expect(isInWindow(at('2026-01-01T00:00:00Z'), undefined, undefined)).toBe(true)
  })

  it('includes the start and excludes the end', () => {
    expect(isInWindow(at(START) - 1, START, END)).toBe(false)
    expect(isInWindow(at(START), START, END)).toBe(true)
    expect(isInWindow(at(END) - 1, START, END)).toBe(true)
    expect(isInWindow(at(END), START, END)).toBe(false)
  })

  it('supports a start or an end on its own', () => {
    expect(isInWindow(at('2026-02-01T00:00:00Z'), START, null)).toBe(false)
    expect(isInWindow(at('2030-01-01T00:00:00Z'), START, null)).toBe(true)
    expect(isInWindow(at('2026-02-01T00:00:00Z'), null, END)).toBe(true)
    expect(isInWindow(at('2030-01-01T00:00:00Z'), null, END)).toBe(false)
  })

  it('ignores a date it cannot parse', () => {
    expect(isInWindow(at('2026-03-15T00:00:00Z'), 'not a date', END)).toBe(true)
  })
})
