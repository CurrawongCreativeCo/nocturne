import type { StegaBranded } from 'next-sanity'

import type { LOCATION_QUERY_RESULT } from '@/types/sanity.types'

/**
 * Frontend-facing types derived from TypeGen output. Never hand-write a shape
 * that a query already describes — derive it here so schema changes propagate.
 */
/** A location as its page shows it: `getLocation` guarantees the slug. */
export type LocationData = StegaBranded<NonNullable<LOCATION_QUERY_RESULT>> & { slug: string }
