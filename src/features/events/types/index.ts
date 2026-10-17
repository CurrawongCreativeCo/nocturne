import type { StegaBranded } from 'next-sanity'

import type { EVENT_QUERY_RESULT, EVENTS_FEED_QUERY_RESULT } from '@/types/sanity.types'

/**
 * Frontend-facing types derived from TypeGen output. Never hand-write a shape
 * that a query already describes — derive it here so schema changes propagate.
 */
/** An event as its page shows it: `getEvent` guarantees the slug. */
export type EventData = StegaBranded<NonNullable<EVENT_QUERY_RESULT>> & { slug: string }

/** An event as the calendar feed carries it. */
export type FeedEvent = NonNullable<EVENTS_FEED_QUERY_RESULT>['events'][number]
