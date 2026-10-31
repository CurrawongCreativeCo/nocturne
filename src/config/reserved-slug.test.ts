import { describe, expect, it } from 'vitest'

import { reservedSegment } from './reserved-slug'

describe('reservedSegment', () => {
  it('names the first segment when a route uses it', () => {
    expect(reservedSegment('blog')).toBe('blog')
    expect(reservedSegment('blog/news')).toBe('blog')
    expect(reservedSegment('section-gallery')).toBe('section-gallery')
    expect(reservedSegment('api/thing')).toBe('api')
  })

  it('reserves the pre-launch preview segment', () => {
    expect(reservedSegment('prelaunch-view')).toBe('prelaunch-view')
    expect(reservedSegment('prelaunch-view/about')).toBe('prelaunch-view')
    expect(reservedSegment('prelaunch')).toBeNull()
  })

  it('reserves team only above the profile pages', () => {
    expect(reservedSegment('team/ann-lee')).toBe('team')
    expect(reservedSegment('team/a/b')).toBe('team')
    expect(reservedSegment('team')).toBeNull()
  })

  it('reserves events only above the event pages', () => {
    expect(reservedSegment('events/open-day')).toBe('events')
    expect(reservedSegment('events/a/b')).toBe('events')
    expect(reservedSegment('events')).toBeNull()
  })

  it('reserves services above the service pages only while the flag is on', () => {
    expect(reservedSegment('services/web-design')).toBeNull()
    expect(reservedSegment('services/web-design', { services: true })).toBe('services')
    expect(reservedSegment('services', { services: true })).toBeNull()
  })

  it('leaves other paths alone, including ones that merely contain a reserved word', () => {
    expect(reservedSegment('about')).toBeNull()
    expect(reservedSegment('about/team')).toBeNull()
    expect(reservedSegment('our-team/ann')).toBeNull()
    expect(reservedSegment('home')).toBeNull()
  })
})
