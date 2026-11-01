import { describe, expect, it } from 'vitest'

import { LOCATION_SLUG_PATTERN, slugifyLocation } from './slug'

describe('slugifyLocation', () => {
  it('lowercases, strips accents and joins words with single hyphens', () => {
    expect(slugifyLocation('Western Sydney')).toBe('western-sydney')
    expect(slugifyLocation('  Dubbo — Orana & Central West! ')).toBe('dubbo-orana-central-west')
  })

  it('never produces a slash', () => {
    expect(slugifyLocation('Newcastle / Hunter')).toBe('newcastle-hunter')
  })
})

describe('LOCATION_SLUG_PATTERN', () => {
  it('accepts one segment and rejects paths and stray hyphens', () => {
    expect(LOCATION_SLUG_PATTERN.test('parramatta')).toBe(true)
    expect(LOCATION_SLUG_PATTERN.test('a/b')).toBe(false)
    expect(LOCATION_SLUG_PATTERN.test('-a')).toBe(false)
    expect(LOCATION_SLUG_PATTERN.test('Upper')).toBe(false)
  })
})
