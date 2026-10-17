/**
 * The desk's event lists. They run in the Studio, not on the site, so the clock is fine here: `now()`
 * is evaluated by the Content Lake each time a list loads. Dates compare as ISO 8601 strings, which
 * sort in time order, so `coalesce(end, start) >= now()` means "has not finished".
 */
const REPEATS = `["weekly", "fortnightly", "monthly"]`

/**
 * An event that is still to come or under way: a one-off whose end (or start) is not past, or a
 * series with no last date or a last date that is not past.
 */
const UPCOMING = `defined(start) && (
  (recurrence.repeat in ${REPEATS} && (!defined(recurrence.until) || recurrence.until + "T23:59:59Z" >= now()))
  || (!(recurrence.repeat in ${REPEATS}) && coalesce(end, start) >= now())
)`

export const UPCOMING_EVENTS_FILTER = `_type == "event" && ${UPCOMING}`

/** Everything that is not upcoming: finished events and series, and events with no date yet. */
export const PAST_EVENTS_FILTER = `_type == "event" && !(${UPCOMING})`

/** Soonest first for upcoming events, most recent first for past ones. */
export const UPCOMING_EVENTS_ORDER = [{ field: 'start', direction: 'asc' }] as const
export const PAST_EVENTS_ORDER = [{ field: 'start', direction: 'desc' }] as const
