import { describe, expect, it } from 'vitest'

import { formatServicePrice } from './price'

describe('formatServicePrice', () => {
  it('writes whole dollars without cents and keeps the unit', () => {
    expect(formatServicePrice(150, 'per hour')).toBe('From $150 per hour')
  })

  it('keeps cents when there are any, and groups thousands', () => {
    expect(formatServicePrice(1250.5, 'per project')).toBe('From $1,250.50 per project')
  })
})
