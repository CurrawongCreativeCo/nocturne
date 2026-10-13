import { describe, expect, it } from 'vitest'

import { DEFAULT_TRACES_SAMPLE_RATE, parseSampleRate } from './config'

describe('parseSampleRate', () => {
  it('defaults when unset or blank', () => {
    expect(parseSampleRate(undefined)).toBe(DEFAULT_TRACES_SAMPLE_RATE)
    expect(parseSampleRate('')).toBe(DEFAULT_TRACES_SAMPLE_RATE)
    expect(parseSampleRate('  ')).toBe(DEFAULT_TRACES_SAMPLE_RATE)
  })

  it('accepts rates from 0 to 1', () => {
    expect(parseSampleRate('0')).toBe(0)
    expect(parseSampleRate('0.25')).toBe(0.25)
    expect(parseSampleRate('1')).toBe(1)
  })

  it('defaults for text and out-of-range values', () => {
    expect(parseSampleRate('lots')).toBe(DEFAULT_TRACES_SAMPLE_RATE)
    expect(parseSampleRate('-0.1')).toBe(DEFAULT_TRACES_SAMPLE_RATE)
    expect(parseSampleRate('2')).toBe(DEFAULT_TRACES_SAMPLE_RATE)
  })
})
