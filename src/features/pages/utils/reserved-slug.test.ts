import { describe, expect, it } from 'vitest'

import { reservedSegment } from './reserved-slug'

describe('reservedSegment', () => {
  it('names the first segment when a route uses it', () => {
    expect(reservedSegment('blog')).toBe('blog')
    expect(reservedSegment('blog/news')).toBe('blog')
    expect(reservedSegment('section-gallery')).toBe('section-gallery')
    expect(reservedSegment('api/thing')).toBe('api')
  })

  it('reserves team only above the profile pages', () => {
    expect(reservedSegment('team/ann-lee')).toBe('team')
    expect(reservedSegment('team/a/b')).toBe('team')
    expect(reservedSegment('team')).toBeNull()
  })

  it('leaves other paths alone, including ones that merely contain a reserved word', () => {
    expect(reservedSegment('about')).toBeNull()
    expect(reservedSegment('about/team')).toBeNull()
    expect(reservedSegment('our-team/ann')).toBeNull()
    expect(reservedSegment('home')).toBeNull()
  })
})
