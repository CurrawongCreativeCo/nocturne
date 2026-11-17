import { describe, expect, it } from 'vitest'

import {
  permissionWarning,
  sourceDateWarning,
  testimonialDate,
  testimonialRating,
  testimonialSourceLabel,
} from './testimonial-source'

describe('testimonial source rules', () => {
  it('draws the source as plain words, and nothing for Other or an unknown value', () => {
    expect(testimonialSourceLabel('client-feedback')).toBe('Client feedback')
    expect(testimonialSourceLabel('google-review')).toBe('Google review')
    expect(testimonialSourceLabel('other')).toBeUndefined()
    expect(testimonialSourceLabel('trustpilot')).toBeUndefined()
    expect(testimonialSourceLabel(undefined)).toBeUndefined()
  })

  it('takes only a whole rating from 1 to 5', () => {
    expect(testimonialRating(5)).toBe(5)
    for (const rating of [0, 6, 4.5, null, undefined])
      expect(testimonialRating(rating)).toBeUndefined()
  })

  it('takes only a stored date', () => {
    expect(testimonialDate('2026-03-12')).toBe('2026-03-12')
    expect(testimonialDate('last week')).toBeUndefined()
  })

  it('warns while permission isn’t confirmed', () => {
    expect(permissionWarning(true)).toBe(true)
    expect(permissionWarning(false)).toContain('permission')
    expect(permissionWarning(undefined)).toContain('permission')
  })

  it('warns when a copied Google review has no date, and for nothing else', () => {
    expect(sourceDateWarning('google-review', undefined)).toContain('date')
    expect(sourceDateWarning('google-review', '2026-03-12')).toBe(true)
    expect(sourceDateWarning('email', undefined)).toBe(true)
  })
})
