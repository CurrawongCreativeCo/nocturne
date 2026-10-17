// Its own module, not in paths.ts: client code imports that one, and every byte of shared JavaScript counts (README, Performance budgets).
/**
 * Event pages: `/events/<slug>` (src/features/events). Like `team`, a CMS page can't have a path
 * *under* it, but a page called exactly `events` is fine: that is where the Events section with
 * every upcoming event usually lives. The calendar files are `/events/<slug>.ics` (one event) and
 * `/events/feed.ics` (every upcoming event); next.config.ts rewrites them to the handlers under
 * `/api/events`.
 */
export const EVENTS_SEGMENT = 'events'
export const EVENTS_PATH = `/${EVENTS_SEGMENT}`
export const EVENTS_FEED_PATH = `${EVENTS_PATH}/feed.ics`

/** Event slug -> "/events/<slug>". */
export function eventPath(slug: string): string {
  return `${EVENTS_PATH}/${slug}`
}

/** Event slug -> "/events/<slug>.ics", the add-to-calendar file for that event. */
export function eventIcsPath(slug: string): string {
  return `${eventPath(slug)}.ics`
}
