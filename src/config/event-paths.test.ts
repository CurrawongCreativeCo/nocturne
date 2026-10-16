import { describe, expect, it } from 'vitest'

import { eventIcsPath, eventPath, EVENTS_FEED_PATH, EVENTS_PATH } from './event-paths'

describe('event paths', () => {
  it('puts events under /events and their calendar files beside them', () => {
    expect(EVENTS_PATH).toBe('/events')
    expect(eventPath('open-day')).toBe('/events/open-day')
    expect(eventIcsPath('open-day')).toBe('/events/open-day.ics')
    expect(EVENTS_FEED_PATH).toBe('/events/feed.ics')
  })
})
