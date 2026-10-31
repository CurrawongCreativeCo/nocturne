import { describe, expect, it } from 'vitest'

import { SERVICE_SLUG_PATTERN, slugifyService } from './slug'

describe('slugifyService', () => {
  it('lowercases, strips accents and joins words with single hyphens', () => {
    expect(slugifyService('Emergency plumbing')).toBe('emergency-plumbing')
    expect(slugifyService('  Café & Catering — Events! ')).toBe('cafe-catering-events')
  })

  it('never produces a slash', () => {
    expect(slugifyService('Web / Design')).toBe('web-design')
  })
})

describe('SERVICE_SLUG_PATTERN', () => {
  it('accepts one segment and rejects paths and stray hyphens', () => {
    expect(SERVICE_SLUG_PATTERN.test('emergency-plumbing')).toBe(true)
    expect(SERVICE_SLUG_PATTERN.test('a/b')).toBe(false)
    expect(SERVICE_SLUG_PATTERN.test('-a')).toBe(false)
    expect(SERVICE_SLUG_PATTERN.test('Upper')).toBe(false)
  })
})
