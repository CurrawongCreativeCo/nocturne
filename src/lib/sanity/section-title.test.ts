import { describe, expect, it } from 'vitest'

import { sectionTitle } from './section-title'

describe('sectionTitle', () => {
  it('prefers the heading’s words over the old title', () => {
    expect(sectionTitle({ title: 'Old', headingPlain: 'New words' })).toBe('New words')
  })

  it('falls back to the old title until the migration has run', () => {
    expect(sectionTitle({ title: 'Old' })).toBe('Old')
    expect(sectionTitle({ title: 'Old', headingPlain: '   ' })).toBe('Old')
    expect(sectionTitle({ title: 'Old', headingPlain: null })).toBe('Old')
  })

  it('is undefined when there is no title at all, so the section draws no heading', () => {
    expect(sectionTitle({})).toBeUndefined()
    expect(sectionTitle({ title: '', headingPlain: '' })).toBeUndefined()
    expect(sectionTitle({ title: null, headingPlain: null })).toBeUndefined()
  })
})
