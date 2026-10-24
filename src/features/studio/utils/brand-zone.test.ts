import { describe, expect, it } from 'vitest'

import { showsBrandZone } from './brand-zone'

describe('showsBrandZone', () => {
  it.each([
    [0, false],
    [1, false],
    [2, false],
    [3, true],
    [4, true],
  ])('media index %i -> %s', (index, expected) => {
    expect(showsBrandZone(index)).toBe(expected)
  })
})
